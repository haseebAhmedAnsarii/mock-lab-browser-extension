import React, { useState } from 'react';
import { Copy, Check, ChevronRight, ChevronDown } from 'lucide-react';

interface JsonViewerProps {
  data: any;
  initialExpandedDepth?: number;
  maxStringLength?: number;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({
  data,
  initialExpandedDepth = 2,
  maxStringLength = 120,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  let parsedData = data;
  if (typeof data === 'string') {
    try {
      parsedData = JSON.parse(data);
    } catch {
      // Raw string format
      return (
        <div className="relative font-mono text-xs bg-app-surface text-app-text p-3 rounded overflow-x-auto border border-app-border">
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 p-1.5 rounded bg-app-elevated hover:bg-app-border text-app-muted transition-colors border border-app-border"
            title="Copy Text"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-app-success" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <pre className="whitespace-pre-wrap break-all">{data}</pre>
        </div>
      );
    }
  }

  return (
    <div className="relative font-mono text-xs bg-app-surface text-app-text p-3.5 rounded border border-app-border overflow-x-auto">
      <div className="flex justify-between items-center mb-2 pb-2 border-b border-app-border">
        <span className="text-[11px] text-app-muted font-sans font-bold uppercase tracking-wider">
          JSON Response
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-app-bg hover:bg-app-elevated text-app-muted hover:text-app-text transition-colors text-[11px] font-sans border border-app-border"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-app-success" />
              <span className="text-app-success font-semibold">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy JSON</span>
            </>
          )}
        </button>
      </div>

      <JsonNode
        value={parsedData}
        depth={0}
        initialExpandedDepth={initialExpandedDepth}
        maxStringLength={maxStringLength}
      />
    </div>
  );
};

interface JsonNodeProps {
  keyName?: string;
  value: any;
  depth: number;
  initialExpandedDepth: number;
  maxStringLength: number;
  isLast?: boolean;
}

const JsonNode: React.FC<JsonNodeProps> = ({
  keyName,
  value,
  depth,
  initialExpandedDepth,
  maxStringLength,
  isLast = true,
}) => {
  const [expanded, setExpanded] = useState<boolean>(depth < initialExpandedDepth);

  const isObject = value !== null && typeof value === 'object';
  const isArray = Array.isArray(value);

  if (value === null) {
    return (
      <div className="leading-5">
        {keyName && <span className="text-app-primary">"{keyName}": </span>}
        <span className="text-app-faint italic">null</span>
        {!isLast && <span className="text-app-faint">,</span>}
      </div>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <div className="leading-5">
        {keyName && <span className="text-app-primary">"{keyName}": </span>}
        <span className="text-app-warning">{value ? 'true' : 'false'}</span>
        {!isLast && <span className="text-app-faint">,</span>}
      </div>
    );
  }

  if (typeof value === 'number') {
    return (
      <div className="leading-5">
        {keyName && <span className="text-app-primary">"{keyName}": </span>}
        <span className="text-app-accent">{value}</span>
        {!isLast && <span className="text-app-faint">,</span>}
      </div>
    );
  }

  if (typeof value === 'string') {
    const isTruncated = value.length > maxStringLength;
    const displayValue = isTruncated ? `${value.slice(0, maxStringLength)}...` : value;

    return (
      <div className="leading-5 break-all">
        {keyName && <span className="text-app-primary">"{keyName}": </span>}
        <span className="text-app-success">"{displayValue}"</span>
        {!isLast && <span className="text-app-faint">,</span>}
      </div>
    );
  }

  if (isObject) {
    const keys = Object.keys(value);
    const count = keys.length;
    const openBracket = isArray ? '[' : '{';
    const closeBracket = isArray ? ']' : '}';

    if (count === 0) {
      return (
        <div className="leading-5">
          {keyName && <span className="text-app-primary">"{keyName}": </span>}
          <span className="text-app-muted">{openBracket}{closeBracket}</span>
          {!isLast && <span className="text-app-faint">,</span>}
        </div>
      );
    }

    return (
      <div className="leading-5">
        <div
          onClick={() => setExpanded(!expanded)}
          className="cursor-pointer inline-flex items-center gap-1 hover:bg-app-elevated rounded px-1 -ml-1 transition-colors group select-none"
        >
          {expanded ? (
            <ChevronDown className="w-3 h-3 text-app-muted group-hover:text-app-text" />
          ) : (
            <ChevronRight className="w-3 h-3 text-app-muted group-hover:text-app-text" />
          )}

          {keyName && <span className="text-app-primary">"{keyName}": </span>}
          <span className="text-app-muted">{openBracket}</span>
          {!expanded && (
            <span className="text-app-faint text-[11px] px-1 bg-app-bg rounded mx-1 border border-app-border">
              {isArray ? `${count} items` : `${count} keys`}
            </span>
          )}
          {!expanded && <span className="text-app-muted">{closeBracket}</span>}
          {!expanded && !isLast && <span className="text-app-faint">,</span>}
        </div>

        {expanded && (
          <div className="pl-4 border-l border-app-border my-0.5 space-y-0.5">
            {keys.map((k, index) => (
              <JsonNode
                key={k}
                keyName={isArray ? undefined : k}
                value={value[k]}
                depth={depth + 1}
                initialExpandedDepth={initialExpandedDepth}
                maxStringLength={maxStringLength}
                isLast={index === keys.length - 1}
              />
            ))}
          </div>
        )}

        {expanded && (
          <div>
            <span className="text-app-muted">{closeBracket}</span>
            {!isLast && <span className="text-app-faint">,</span>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="leading-5">
      {keyName && <span className="text-app-primary">"{keyName}": </span>}
      <span className="text-app-muted">{String(value)}</span>
      {!isLast && <span className="text-app-faint">,</span>}
    </div>
  );
};
