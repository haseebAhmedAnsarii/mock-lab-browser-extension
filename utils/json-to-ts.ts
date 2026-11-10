/**
 * Generates TypeScript interface definitions from a JSON string or object.
 */
export function jsonToTypeScript(
  jsonInput: string | object,
  rootName: string = 'ApiResponse'
): string {
  let data: any;

  if (typeof jsonInput === 'string') {
    try {
      data = JSON.parse(jsonInput);
    } catch (err) {
      return `// Failed to parse JSON:\n// ${err instanceof Error ? err.message : String(err)}`;
    }
  } else {
    data = jsonInput;
  }

  if (data === null || data === undefined) {
    return `export type ${sanitizeTypeName(rootName)} = null;`;
  }

  const interfaces: Map<string, string> = new Map();

  function sanitizeTypeName(name: string): string {
    const clean = name
      .replace(/[^a-zA-Z0-9_]/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
    return clean || 'AnonymousType';
  }

  function sanitizePropKey(key: string): string {
    if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
      return key;
    }
    return JSON.stringify(key);
  }

  function getType(value: any, keyHint: string = 'Item'): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';

    const valType = typeof value;

    if (valType === 'string') return 'string';
    if (valType === 'number') return 'number';
    if (valType === 'boolean') return 'boolean';

    if (Array.isArray(value)) {
      if (value.length === 0) return 'any[]';

      // Check item types
      const types = Array.from(new Set(value.map(item => getType(item, keyHint))));
      if (types.length === 1) {
        return `${types[0]}[]`;
      }
      return `(${types.join(' | ')})[]`;
    }

    if (valType === 'object') {
      const typeName = sanitizeTypeName(keyHint);
      // Recursively create interface
      generateInterface(value, typeName);
      return typeName;
    }

    return 'any';
  }

  function generateInterface(obj: Record<string, any>, typeName: string): void {
    if (interfaces.has(typeName)) {
      return;
    }

    // Reserve spot to prevent infinite recursion
    interfaces.set(typeName, '');

    const lines: string[] = [];
    lines.push(`export interface ${typeName} {`);

    const entries = Object.entries(obj);
    if (entries.length === 0) {
      lines.push('  [key: string]: any;');
    } else {
      for (const [key, val] of entries) {
        const propKey = sanitizePropKey(key);
        const childTypeHint = `${typeName}_${key.charAt(0).toUpperCase() + key.slice(1)}`;
        const childType = getType(val, childTypeHint);
        lines.push(`  ${propKey}: ${childType};`);
      }
    }

    lines.push('}');
    interfaces.set(typeName, lines.join('\n'));
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return `export type ${sanitizeTypeName(rootName)} = any[];`;
    }
    const itemType = getType(data[0], `${rootName}Item`);
    const allInterfaces = Array.from(interfaces.values()).filter(Boolean).join('\n\n');
    return `${allInterfaces ? allInterfaces + '\n\n' : ''}export type ${sanitizeTypeName(rootName)} = ${itemType}[];`;
  }

  if (typeof data === 'object') {
    generateInterface(data, sanitizeTypeName(rootName));
    return Array.from(interfaces.values()).filter(Boolean).join('\n\n');
  }

  return `export type ${sanitizeTypeName(rootName)} = ${typeof data};`;
}

