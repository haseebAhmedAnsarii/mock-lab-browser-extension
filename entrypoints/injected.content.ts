import { defineContentScript } from 'wxt/utils/define-content-script';
import { CapturedRequest, LatencyRule } from '../utils/types';

export default defineContentScript({
  matches: ['<all_urls>'],
  world: 'MAIN',
  runAt: 'document_start',
  main() {
    // Prevent double injection
    if ((window as any).__DEV_CHAOS_INJECTED__) return;
    (window as any).__DEV_CHAOS_INJECTED__ = true;

    let activeRules: LatencyRule[] = [];
    let isMonitoringEnabled = true;

    // Helper to update active rules & monitoring
    function updateConfig(newRules: any, monitoring: any) {
      if (Array.isArray(newRules)) {
        activeRules = newRules;
      }
      if (typeof monitoring === 'boolean') {
        isMonitoringEnabled = monitoring;
      }
    }

    // Helper to execute replay in page MAIN world context
    function executeReplay(req: any) {
      if (!req || !req.url) return;
      try {
        window.fetch(req.url, {
          method: req.method || 'GET',
          headers: req.headers,
          body: ['POST', 'PUT', 'PATCH'].includes((req.method || '').toUpperCase()) ? req.body : undefined,
        }).catch((err) => {
          console.warn('[Dev Mock Injected] Replay fetch error:', err);
        });
      } catch (err) {
        console.error('[Dev Mock Injected] Failed to replay fetch:', err);
      }
    }

    // 1. Listen for rule/config updates and replay requests via window.postMessage
    window.addEventListener('message', (event) => {
      if (event.data?.source === 'DEV_MOCK_CONTENT') {
        if (event.data.type === 'UPDATE_CONFIG') {
          updateConfig(event.data.rules, event.data.monitoringEnabled);
        } else if (event.data.type === 'REPLAY_REQUEST') {
          executeReplay(event.data.request);
        }
      }
    });

    // 2. Also listen via document CustomEvent as redundant backup for config updates
    document.addEventListener('__DEV_CHAOS_CONFIG_EVENT__', (event: any) => {
      if (event.detail && event.detail.rules) {
        updateConfig(event.detail.rules, event.detail.monitoringEnabled);
      }
    });

    // Announce to the content script that the injected interceptor is ready
    window.postMessage({ source: 'DEV_MOCK_INJECTED', type: 'READY' }, '*');

    function findMatchingRule(url: string): LatencyRule | undefined {
      return activeRules.find((rule) => {
        if (!rule.enabled || !rule.urlPattern) return false;
        const pattern = rule.urlPattern.trim();
        if (!pattern) return false;

        try {
          const lowerUrl = url.toLowerCase();
          const lowerPattern = pattern.toLowerCase();

          // 1. Direct substring match (case-insensitive)
          if (lowerUrl.includes(lowerPattern)) {
            return true;
          }

          // 2. Wildcard glob matching (* and ?)
          if (pattern.includes('*') || pattern.includes('?')) {
            let glob = pattern;
            // If the wildcard doesn't start with http or *, allow matching anywhere in path/url
            if (!glob.startsWith('*') && !glob.startsWith('http://') && !glob.startsWith('https://')) {
              glob = '*' + glob;
            }
            if (!glob.endsWith('*')) {
              glob = glob + '*';
            }
            const regexStr =
              '^' +
              glob
                .replace(/[.+^${}()|[\]\\]/g, '\\$&')
                .replace(/\*/g, '.*')
                .replace(/\?/g, '.') +
              '$';
            return new RegExp(regexStr, 'i').test(url);
          }

          return false;
        } catch {
          return false;
        }
      });
    }

    function emitTraceEvent(data: CapturedRequest) {
      window.postMessage(
        {
          source: 'DEV_MOCK_INJECTED',
          type: 'API_TRACE',
          payload: data,
        },
        '*'
      );
    }

    // --------------------------------------------------------------------------
    // Intercept Fetch API
    // --------------------------------------------------------------------------
    const originalFetch = window.fetch;

    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      if (!isMonitoringEnabled) {
        return originalFetch.apply(this, [input, init]);
      }

      const requestId = 'req_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      const startTime = performance.now();
      const startTimestamp = Date.now();

      let url = '';
      let method = 'GET';
      const requestHeaders: Record<string, string> = {};
      let requestBody: string | null = null;

      try {
        if (typeof input === 'string') {
          url = input;
        } else if (input instanceof URL) {
          url = input.toString();
        } else if (input instanceof Request) {
          url = input.url;
          method = input.method;
        }

        if (init) {
          if (init.method) method = init.method.toUpperCase();
          if (init.headers) {
            if (init.headers instanceof Headers) {
              init.headers.forEach((val, key) => {
                requestHeaders[key] = val;
              });
            } else if (Array.isArray(init.headers)) {
              init.headers.forEach(([k, v]) => {
                requestHeaders[k] = v;
              });
            } else {
              Object.assign(requestHeaders, init.headers);
            }
          }
          if (init.body) {
            if (typeof init.body === 'string') {
              requestBody = init.body;
            } else if (init.body instanceof FormData) {
              const entries: Record<string, any> = {};
              init.body.forEach((val, key) => {
                entries[key] = typeof val === 'string' ? val : `[File: ${val.name}]`;
              });
              requestBody = JSON.stringify(entries);
            } else {
              requestBody = '[Binary/Stream Body]';
            }
          }
        }
      } catch {
        // Ignore parsing errors
      }

      // Check Route-Level Latency & Chaos Rules
      const matchingRule = findMatchingRule(url);
      let wasThrottled = false;
      let throttleDelayMs = 0;

      if (matchingRule) {
        wasThrottled = true;
        throttleDelayMs = matchingRule.delayMs || 0;

        // Synthetic Latency
        if (matchingRule.delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, matchingRule.delayMs));
        }

        // Offline Simulation
        if (matchingRule.simulateOffline) {
          const duration = Math.round(performance.now() - startTime);
          emitTraceEvent({
            id: requestId,
            url,
            method,
            type: 'fetch',
            startTime: startTimestamp,
            endTime: Date.now(),
            duration,
            status: 0,
            statusText: 'Offline Drop',
            requestHeaders,
            requestBody,
            error: 'TypeError: Failed to fetch (simulated offline mode)',
            isSlow: duration > 500,
            wasThrottled,
            throttleDelayMs,
          });
          throw new TypeError('Failed to fetch (simulated offline mode)');
        }

        // Check Flaky Failure Rate
        const shouldFailFlaky =
          matchingRule.failureRate && Math.random() * 100 < matchingRule.failureRate;

        // Mock Status Override (either explicitly set or triggered by flaky failure)
        const effectiveMockStatus = shouldFailFlaky ? (matchingRule.mockStatus || 500) : matchingRule.mockStatus;

        if (effectiveMockStatus && effectiveMockStatus > 0) {
          const duration = Math.round(performance.now() - startTime);
          const mockBody =
            matchingRule.mockBody ||
            JSON.stringify({
              message: shouldFailFlaky
                ? `Flaky network chaos failure (${matchingRule.failureRate}% rate)`
                : `Synthetic chaos response ${effectiveMockStatus}`,
              rule: matchingRule.name,
              status: effectiveMockStatus,
            });

          const mockResponse = new Response(mockBody, {
            status: effectiveMockStatus,
            statusText: `Chaos Mock ${effectiveMockStatus}`,
            headers: {
              'content-type': 'application/json',
              'x-chaos-mock': 'true',
            },
          });

          emitTraceEvent({
            id: requestId,
            url,
            method,
            type: 'fetch',
            startTime: startTimestamp,
            endTime: Date.now(),
            duration,
            status: effectiveMockStatus,
            statusText: `Chaos Mock ${effectiveMockStatus}`,
            requestHeaders,
            requestBody,
            responseHeaders: { 'content-type': 'application/json', 'x-chaos-mock': 'true' },
            responseBody: mockBody,
            size: mockBody.length,
            isSlow: duration > 500,
            wasThrottled,
            throttleDelayMs,
          });

          return mockResponse;
        }
      }

      try {
        const response = await originalFetch.apply(this, [input, init]);
        const duration = Math.round(performance.now() - startTime);

        // Clone response to read body without consuming the consumer's stream
        const responseClone = response.clone();
        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((val, key) => {
          responseHeaders[key] = val;
        });

        let responseBody: string | null = null;
        let size = 0;

        try {
          const text = await responseClone.text();
          responseBody = text;
          size = new Blob([text]).size;
        } catch {
          responseBody = '[Unreadable Response Body]';
        }

        emitTraceEvent({
          id: requestId,
          url,
          method,
          type: 'fetch',
          startTime: startTimestamp,
          endTime: Date.now(),
          duration,
          status: response.status,
          statusText: response.statusText,
          requestHeaders,
          requestBody,
          responseHeaders,
          responseBody,
          size,
          isSlow: duration > 500,
          wasThrottled,
          throttleDelayMs,
        });

        return response;
      } catch (err: any) {
        const duration = Math.round(performance.now() - startTime);
        emitTraceEvent({
          id: requestId,
          url,
          method,
          type: 'fetch',
          startTime: startTimestamp,
          endTime: Date.now(),
          duration,
          status: 0,
          statusText: 'Network Error',
          requestHeaders,
          requestBody,
          error: err?.message || String(err),
          isSlow: duration > 500,
          wasThrottled,
          throttleDelayMs,
        });
        throw err;
      }
    };

    // --------------------------------------------------------------------------
    // Intercept XMLHttpRequest (XHR)
    // --------------------------------------------------------------------------
    const XHR = window.XMLHttpRequest;
    const originalOpen = XHR.prototype.open;
    const originalSend = XHR.prototype.send;
    const originalSetRequestHeader = XHR.prototype.setRequestHeader;

    XHR.prototype.open = function (
      method: string,
      url: string | URL,
      async: boolean = true,
      user?: string | null,
      password?: string | null
    ) {
      (this as any).__trace = {
        id: 'req_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now(),
        method: (method || 'GET').toUpperCase(),
        url: typeof url === 'string' ? url : url.toString(),
        requestHeaders: {} as Record<string, string>,
        startTime: 0,
        startTimestamp: 0,
      };

      return originalOpen.apply(this, [method, url, async, user, password]);
    };

    XHR.prototype.setRequestHeader = function (header: string, value: string) {
      if ((this as any).__trace) {
        (this as any).__trace.requestHeaders[header] = value;
      }
      return originalSetRequestHeader.apply(this, [header, value]);
    };

    XHR.prototype.send = function (body?: any) {
      if (!isMonitoringEnabled || !(this as any).__trace) {
        return originalSend.apply(this, [body]);
      }

      const trace = (this as any).__trace;
      trace.startTime = performance.now();
      trace.startTimestamp = Date.now();

      if (body) {
        if (typeof body === 'string') {
          trace.requestBody = body;
        } else if (body instanceof FormData) {
          const obj: Record<string, any> = {};
          body.forEach((v, k) => {
            obj[k] = typeof v === 'string' ? v : `[File: ${v.name}]`;
          });
          trace.requestBody = JSON.stringify(obj);
        } else {
          trace.requestBody = '[XHR Payload]';
        }
      }

      const matchingRule = findMatchingRule(trace.url);
      trace.wasThrottled = Boolean(matchingRule);
      trace.throttleDelayMs = matchingRule?.delayMs || 0;

      const handleLoadEnd = () => {
        const duration = Math.round(performance.now() - trace.startTime);

        // Parse headers
        const rawHeaders = this.getAllResponseHeaders();
        const responseHeaders: Record<string, string> = {};
        if (rawHeaders) {
          const headerPairs = rawHeaders.trim().split(/[\r\n]+/);
          for (const line of headerPairs) {
            const parts = line.split(': ');
            const header = parts.shift();
            const value = parts.join(': ');
            if (header) responseHeaders[header.toLowerCase()] = value;
          }
        }

        let responseBody: string | null = null;
        try {
          if (this.responseType === '' || this.responseType === 'text') {
            responseBody = this.responseText;
          } else if (this.responseType === 'json') {
            responseBody = JSON.stringify(this.response);
          } else {
            responseBody = `[${this.responseType} Response]`;
          }
        } catch {
          responseBody = '[Unreadable XHR Response]';
        }

        emitTraceEvent({
          id: trace.id,
          url: trace.url,
          method: trace.method,
          type: 'xhr',
          startTime: trace.startTimestamp,
          endTime: Date.now(),
          duration,
          status: this.status,
          statusText: this.statusText,
          requestHeaders: trace.requestHeaders,
          requestBody: trace.requestBody,
          responseHeaders,
          responseBody,
          size: responseBody ? new Blob([responseBody]).size : 0,
          isSlow: duration > 500,
          wasThrottled: trace.wasThrottled,
          throttleDelayMs: trace.throttleDelayMs,
        });
      };

      this.addEventListener('loadend', handleLoadEnd, { once: true });

      // Apply synthetic delay to XHR if matching
      if (matchingRule && matchingRule.delayMs > 0) {
        setTimeout(() => {
          originalSend.apply(this, [body]);
        }, matchingRule.delayMs);
        return;
      }

      return originalSend.apply(this, [body]);
    };
  },
});
