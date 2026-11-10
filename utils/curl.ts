import { CapturedRequest } from './types';

/**
 * Converts a CapturedRequest into a reproducible cURL command string.
 */
export function requestToCurl(request: CapturedRequest): string {
  const parts: string[] = ['curl'];

  // Method
  if (request.method && request.method !== 'GET') {
    parts.push(`-X ${request.method.toUpperCase()}`);
  }

  // URL
  parts.push(`"${request.url}"`);

  // Headers
  if (request.requestHeaders) {
    for (const [key, value] of Object.entries(request.requestHeaders)) {
      // Escape double quotes inside header values
      const escapedValue = value.replace(/"/g, '\\"');
      parts.push(`-H "${key}: ${escapedValue}"`);
    }
  }

  // Body
  if (request.requestBody && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method.toUpperCase())) {
    const escapedBody = request.requestBody.replace(/'/g, "'\\''");
    parts.push(`--data-raw '${escapedBody}'`);
  }

  return parts.join(' \\\n  ');
}

/**
 * Exports captured requests to a JSON formatted string.
 */
export function exportRequestsAsJson(requests: CapturedRequest[]): string {
  return JSON.stringify(requests, null, 2);
}

/**
 * Triggers a download of a text/json file in the browser.
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'application/json'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

