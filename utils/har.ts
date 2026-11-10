import { CapturedRequest } from './types';

export interface HarLog {
  log: {
    version: string;
    creator: {
      name: string;
      version: string;
    };
    entries: HarEntry[];
  };
}

export interface HarEntry {
  startedDateTime: string;
  time: number;
  request: {
    method: string;
    url: string;
    httpVersion: string;
    cookies: any[];
    headers: { name: string; value: string }[];
    queryString: { name: string; value: string }[];
    postData?: {
      mimeType: string;
      text: string;
    };
    headersSize: number;
    bodySize: number;
  };
  response: {
    status: number;
    statusText: string;
    httpVersion: string;
    cookies: any[];
    headers: { name: string; value: string }[];
    content: {
      size: number;
      mimeType: string;
      text?: string;
    };
    redirectURL: string;
    headersSize: number;
    bodySize: number;
  };
  cache: Record<string, any>;
  timings: {
    send: number;
    wait: number;
    receive: number;
  };
}

/**
 * Converts captured requests into the standard HTTP Archive (HAR 1.2) format.
 * This can be imported directly into Chrome DevTools Network Tab, Charles, or Postman.
 */
export function requestsToHar(requests: CapturedRequest[]): HarLog {
  const entries: HarEntry[] = requests.map((req) => {
    let queryParams: { name: string; value: string }[] = [];
    try {
      const parsedUrl = new URL(req.url, 'http://localhost');
      queryParams = Array.from(parsedUrl.searchParams.entries()).map(([name, value]) => ({
        name,
        value,
      }));
    } catch {
      // Ignore URL parsing errors
    }

    const requestHeaders = Object.entries(req.requestHeaders || {}).map(([name, value]) => ({
      name,
      value,
    }));

    const responseHeaders = Object.entries(req.responseHeaders || {}).map(([name, value]) => ({
      name,
      value,
    }));

    const duration = req.duration || 0;

    const entry: HarEntry = {
      startedDateTime: new Date(req.startTime).toISOString(),
      time: duration,
      request: {
        method: req.method,
        url: req.url,
        httpVersion: 'HTTP/1.1',
        cookies: [],
        headers: requestHeaders,
        queryString: queryParams,
        headersSize: -1,
        bodySize: req.requestBody ? req.requestBody.length : 0,
      },
      response: {
        status: req.status || 0,
        statusText: req.statusText || '',
        httpVersion: 'HTTP/1.1',
        cookies: [],
        headers: responseHeaders,
        content: {
          size: req.size || (req.responseBody ? req.responseBody.length : 0),
          mimeType: req.responseHeaders?.['content-type'] || 'application/json',
          text: req.responseBody || undefined,
        },
        redirectURL: '',
        headersSize: -1,
        bodySize: req.size || 0,
      },
      cache: {},
      timings: {
        send: 0,
        wait: duration,
        receive: 0,
      },
    };

    if (req.requestBody) {
      entry.request.postData = {
        mimeType: req.requestHeaders?.['content-type'] || 'application/json',
        text: req.requestBody,
      };
    }

    return entry;
  });

  return {
    log: {
      version: '1.2',
      creator: {
        name: 'APITrace Browser Extension',
        version: '1.0.0',
      },
      entries,
    },
  };
}

