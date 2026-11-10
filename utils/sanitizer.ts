import { SanitizerConfig } from './types';

export const DEFAULT_SANITIZER_CONFIG: SanitizerConfig = {
  maskAuthorization: true,
  maskCookies: true,
  maskApiKeys: true,
  customMaskKeys: ['password', 'secret', 'token', 'access_token', 'private_key', 'credit_card'],
};

const SENSITIVE_HEADERS = [
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'api-key',
  'x-auth-token',
  'proxy-authorization',
];

/**
 * Sanitizes request and response headers by masking credentials and secrets.
 */
export function sanitizeHeaders(
  headers: Record<string, string>,
  config: SanitizerConfig = DEFAULT_SANITIZER_CONFIG
): Record<string, string> {
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();

    if (
      (config.maskAuthorization && (lowerKey === 'authorization' || lowerKey === 'proxy-authorization')) ||
      (config.maskCookies && (lowerKey === 'cookie' || lowerKey === 'set-cookie')) ||
      (config.maskApiKeys && SENSITIVE_HEADERS.includes(lowerKey)) ||
      config.customMaskKeys.some(k => lowerKey.includes(k.toLowerCase()))
    ) {
      if (value.startsWith('Bearer ')) {
        sanitized[key] = 'Bearer •••••••• [MASKED]';
      } else if (value.startsWith('Basic ')) {
        sanitized[key] = 'Basic •••••••• [MASKED]';
      } else {
        sanitized[key] = '•••••••• [MASKED]';
      }
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Mask sensitive JSON keys in request/response bodies (e.g. password, token).
 */
export function sanitizeBody(bodyString?: string | null): string | undefined | null {
  if (!bodyString) return bodyString;
  try {
    const parsed = JSON.parse(bodyString);
    const masked = maskJsonKeys(parsed);
    return JSON.stringify(masked, null, 2);
  } catch {
    return bodyString;
  }
}

function maskJsonKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => maskJsonKeys(item));
  }

  const result: Record<string, any> = {};
  const sensitivePatterns = /password|secret|token|api[_-]?key|credit[_-]?card|ssn|auth/i;

  for (const [key, val] of Object.entries(obj)) {
    if (sensitivePatterns.test(key) && typeof val === 'string') {
      result[key] = '•••••••• [MASKED]';
    } else if (typeof val === 'object' && val !== null) {
      result[key] = maskJsonKeys(val);
    } else {
      result[key] = val;
    }
  }

  return result;
}

