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

    const NULL_BODY_STATUSES = new Set([204, 205, 304]);

    function clampMockStatus(status: number): number {
      const normalized = Math.trunc(status);
      return Math.min(599, Math.max(200, normalized));
    }

    function buildMockBody(rule: LatencyRule, status: number, flakyMessage?: string): string | null {
      if (NULL_BODY_STATUSES.has(status)) return null;
      if (rule.mockBody) return rule.mockBody;
      return JSON.stringify({
        message: flakyMessage || `Synthetic mock response ${status}`,
        rule: rule.name,
        status,
      });
    }

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

        // Offline Simulation
        if (matchingRule.simulateOffline) {
          if (matchingRule.delayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, matchingRule.delayMs));
          }
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
        const rawMockStatus = shouldFailFlaky ? (matchingRule.mockStatus || 500) : matchingRule.mockStatus;

        if (rawMockStatus && rawMockStatus > 0) {
          const effectiveMockStatus = clampMockStatus(rawMockStatus);
          if (matchingRule.delayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, matchingRule.delayMs));
          }
          const duration = Math.round(performance.now() - startTime);
          const mockBody = buildMockBody(
            matchingRule,
            effectiveMockStatus,
            shouldFailFlaky ? `Flaky network chaos failure (${matchingRule.failureRate}% rate)` : undefined
          );

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
            size: mockBody ? new Blob([mockBody]).size : 0,
            isSlow: duration > 500,
            wasThrottled,
            throttleDelayMs,
          });

          return mockResponse;
        }
      }

      try {
        // Send request to real network immediately
        const response = await originalFetch.apply(this, [input, init]);

        // Delay the API response before resolving to caller
        if (throttleDelayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, throttleDelayMs));
        }

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
        if (throttleDelayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, throttleDelayMs));
        }
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
    // Intercept XMLHttpRequest (XHR) using a full Virtual Proxy
    // --------------------------------------------------------------------------
    const RealXMLHttpRequest = window.XMLHttpRequest;

    function createProxiedXHR(): any {
      const realXhr = new RealXMLHttpRequest();
      let trace: any = null;
      let matchingRule: LatencyRule | undefined = undefined;
      let isThrottling = false;
      let isMocked = false;
      let mockTimer: ReturnType<typeof setTimeout> | null = null;
      let virtualReadyState = 0;
      let virtualStatus = 0;
      let virtualStatusText = '';
      let virtualResponse: any = null;
      let virtualResponseText = '';
      let virtualResponseXML: any = null;
      let virtualResponseURL = '';
      const virtualHeaders: Record<string, string> = {
        'content-type': 'application/json',
        'x-chaos-mock': 'true',
      };

      const useVirtualState = () => isThrottling || isMocked;

      const userListeners: { type: string; listener: EventListenerOrEventListenerObject; options?: any }[] = [];

      let userOnReadyStateChange: any = null;
      let userOnLoad: any = null;
      let userOnLoadStart: any = null;
      let userOnLoadEnd: any = null;
      let userOnProgress: any = null;
      let userOnError: any = null;
      let userOnTimeout: any = null;
      let userOnAbort: any = null;

      function dispatchToUser(event: Event) {
        const type = event.type;
        const propMap: Record<string, any> = {
          readystatechange: userOnReadyStateChange,
          load: userOnLoad,
          loadstart: userOnLoadStart,
          loadend: userOnLoadEnd,
          progress: userOnProgress,
          error: userOnError,
          timeout: userOnTimeout,
          abort: userOnAbort,
        };

        const handler = propMap[type];
        if (typeof handler === 'function') {
          try {
            handler.call(proxy, event);
          } catch (e) {
            console.error('[Dev Mock XHR Handler Error]', e);
          }
        }

        for (const entry of [...userListeners]) {
          if (entry.type === type) {
            try {
              if (typeof entry.listener === 'function') {
                entry.listener.call(proxy, event);
              } else if (entry.listener && typeof entry.listener.handleEvent === 'function') {
                entry.listener.handleEvent(event);
              }
            } catch (e) {
              console.error('[Dev Mock XHR Listener Error]', e);
            }
          }
        }
      }

      function emitXhrTrace() {
        if (!trace) return;
        const duration = Math.round(performance.now() - trace.startTime);

        const rawHeaders = realXhr.getAllResponseHeaders();
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
          if (realXhr.responseType === '' || realXhr.responseType === 'text') {
            responseBody = realXhr.responseText;
          } else if (realXhr.responseType === 'json') {
            responseBody = JSON.stringify(realXhr.response);
          } else {
            responseBody = `[${realXhr.responseType} Response]`;
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
          status: realXhr.status,
          statusText: realXhr.statusText,
          requestHeaders: trace.requestHeaders,
          requestBody: trace.requestBody,
          responseHeaders,
          responseBody,
          size: responseBody ? new Blob([responseBody]).size : 0,
          isSlow: duration > 500,
          wasThrottled: trace.wasThrottled,
          throttleDelayMs: trace.throttleDelayMs,
        });
      }

      realXhr.addEventListener('loadstart', (e) => {
        dispatchToUser(e);
      });

      realXhr.addEventListener('progress', (e) => {
        if (!isThrottling) {
          dispatchToUser(e);
        }
      });

      realXhr.addEventListener('readystatechange', (e) => {
        if (!isThrottling) {
          dispatchToUser(e);
        } else if (realXhr.readyState < 4) {
          virtualReadyState = realXhr.readyState;
          dispatchToUser(e);
        }
      });

      realXhr.addEventListener('load', (e) => {
        if (!isThrottling) {
          dispatchToUser(e);
        }
      });

      realXhr.addEventListener('error', (e) => {
        if (!isThrottling) {
          dispatchToUser(e);
        }
      });

      realXhr.addEventListener('timeout', (e) => {
        if (!isThrottling) {
          dispatchToUser(e);
        }
      });

      realXhr.addEventListener('abort', (e) => {
        if (!isThrottling) {
          dispatchToUser(e);
        }
      });

      realXhr.addEventListener('loadend', (e) => {
        if (!isThrottling) {
          emitXhrTrace();
          dispatchToUser(e);
          return;
        }

        const delayMs = matchingRule?.delayMs || 0;
        setTimeout(() => {
          virtualReadyState = realXhr.readyState;
          virtualStatus = realXhr.status;
          virtualStatusText = realXhr.statusText;
          virtualResponse = realXhr.response;
          try { virtualResponseText = realXhr.responseText; } catch {}
          try { virtualResponseXML = realXhr.responseXML; } catch {}
          virtualResponseURL = realXhr.responseURL;
          isThrottling = false;

          emitXhrTrace();

          dispatchToUser(new Event('readystatechange'));
          dispatchToUser(new ProgressEvent('load'));
          dispatchToUser(e);
        }, delayMs);
      });

      const proxy: any = {
        get readyState() {
          return useVirtualState() ? virtualReadyState : realXhr.readyState;
        },
        get status() {
          return useVirtualState() ? virtualStatus : realXhr.status;
        },
        get statusText() {
          return useVirtualState() ? virtualStatusText : realXhr.statusText;
        },
        get response() {
          return useVirtualState() ? virtualResponse : realXhr.response;
        },
        get responseText() {
          return useVirtualState() ? virtualResponseText : realXhr.responseText;
        },
        get responseXML() {
          return useVirtualState() ? virtualResponseXML : realXhr.responseXML;
        },
        get responseURL() {
          return useVirtualState() ? virtualResponseURL : realXhr.responseURL;
        },
        get responseType() {
          return realXhr.responseType;
        },
        set responseType(val) {
          realXhr.responseType = val;
        },
        get timeout() {
          return realXhr.timeout;
        },
        set timeout(val) {
          realXhr.timeout = val;
        },
        get withCredentials() {
          return realXhr.withCredentials;
        },
        set withCredentials(val) {
          realXhr.withCredentials = val;
        },
        get upload() {
          return realXhr.upload;
        },

        get onreadystatechange() { return userOnReadyStateChange; },
        set onreadystatechange(fn) { userOnReadyStateChange = fn; },
        get onload() { return userOnLoad; },
        set onload(fn) { userOnLoad = fn; },
        get onloadstart() { return userOnLoadStart; },
        set onloadstart(fn) { userOnLoadStart = fn; },
        get onloadend() { return userOnLoadEnd; },
        set onloadend(fn) { userOnLoadEnd = fn; },
        get onprogress() { return userOnProgress; },
        set onprogress(fn) { userOnProgress = fn; },
        get onerror() { return userOnError; },
        set onerror(fn) { userOnError = fn; },
        get ontimeout() { return userOnTimeout; },
        set ontimeout(fn) { userOnTimeout = fn; },
        get onabort() { return userOnAbort; },
        set onabort(fn) { userOnAbort = fn; },

        open(method: string, url: string | URL, async: boolean = true, user?: string | null, password?: string | null) {
          const urlStr = typeof url === 'string' ? url : url.toString();
          if (mockTimer !== null) {
            clearTimeout(mockTimer);
            mockTimer = null;
          }
          isThrottling = false;
          isMocked = false;
          virtualReadyState = 1;
          virtualStatus = 0;
          virtualStatusText = '';
          virtualResponse = null;
          virtualResponseText = '';
          virtualResponseXML = null;
          virtualResponseURL = '';
          trace = {
            id: 'req_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now(),
            method: (method || 'GET').toUpperCase(),
            url: urlStr,
            requestHeaders: {} as Record<string, string>,
            startTime: 0,
            startTimestamp: 0,
            wasThrottled: false,
            throttleDelayMs: 0,
          };
          matchingRule = findMatchingRule(urlStr);
          if (matchingRule) {
            trace.wasThrottled = true;
            trace.throttleDelayMs = matchingRule.delayMs || 0;
          }
          return realXhr.open(method, url, async, user, password);
        },

        setRequestHeader(header: string, value: string) {
          if (trace) {
            trace.requestHeaders[header] = value;
          }
          return realXhr.setRequestHeader(header, value);
        },

        send(body?: any) {
          if (trace) {
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
          }

          // ── Mock Status intercept (XHR) ──
          const rawMockStatus =
            isMonitoringEnabled && matchingRule?.mockStatus && matchingRule.mockStatus > 0
              ? matchingRule.mockStatus
              : undefined;

          if (rawMockStatus && matchingRule) {
            const effectiveMockStatus = clampMockStatus(rawMockStatus);
            const activeRule = matchingRule;
            isMocked = true;
            virtualReadyState = realXhr.readyState || 1;
            const delayMs = activeRule.delayMs || 0;
            mockTimer = setTimeout(() => {
              mockTimer = null;
              const mockBody = buildMockBody(activeRule, effectiveMockStatus);
              const parsedBody = mockBody === null
                ? null
                : (() => { try { return JSON.parse(mockBody); } catch { return mockBody; } })();

              // Synthesise virtual state without hitting the network
              virtualReadyState = 4;
              virtualStatus = effectiveMockStatus;
              virtualStatusText = `Chaos Mock ${effectiveMockStatus}`;
              virtualResponse = mockBody === null
                ? (realXhr.responseType === 'json' ? null : '')
                : (realXhr.responseType === 'json' ? parsedBody : mockBody);
              virtualResponseText = mockBody ?? '';
              virtualResponseURL = typeof trace?.url === 'string' ? trace.url : '';

              emitTraceEvent({
                id: trace?.id ?? '',
                url: trace?.url ?? '',
                method: trace?.method ?? 'GET',
                type: 'xhr',
                startTime: trace?.startTimestamp ?? Date.now(),
                endTime: Date.now(),
                duration: Math.round(performance.now() - (trace?.startTime ?? 0)),
                status: effectiveMockStatus,
                statusText: `Chaos Mock ${effectiveMockStatus}`,
                requestHeaders: trace?.requestHeaders ?? {},
                requestBody: trace?.requestBody ?? null,
                responseHeaders: { ...virtualHeaders },
                responseBody: mockBody,
                size: mockBody ? new Blob([mockBody]).size : 0,
                isSlow: (activeRule.delayMs ?? 0) > 500,
                wasThrottled: true,
                throttleDelayMs: delayMs,
              });

              dispatchToUser(new Event('readystatechange'));
              dispatchToUser(new ProgressEvent('load'));
              dispatchToUser(new ProgressEvent('loadend'));
            }, delayMs);

            // Do NOT send the real XHR at all
            return;
          }

          if (isMonitoringEnabled && matchingRule && matchingRule.delayMs > 0) {
            isThrottling = true;
          } else {
            isThrottling = false;
          }

          return realXhr.send(body);
        },

        abort() {
          if (mockTimer !== null) {
            clearTimeout(mockTimer);
            mockTimer = null;
            if (isMocked && virtualReadyState !== 4) {
              virtualReadyState = 4;
              virtualStatus = 0;
              virtualStatusText = '';
              dispatchToUser(new Event('readystatechange'));
              dispatchToUser(new ProgressEvent('abort'));
              dispatchToUser(new ProgressEvent('loadend'));
            }
            return;
          }
          isThrottling = false;
          return realXhr.abort();
        },

        getAllResponseHeaders() {
          if (isMocked) {
            return Object.entries(virtualHeaders)
              .map(([k, v]) => `${k}: ${v}\r\n`)
              .join('');
          }
          return realXhr.getAllResponseHeaders();
        },

        getResponseHeader(header: string) {
          if (isMocked) {
            return virtualHeaders[header.toLowerCase()] ?? null;
          }
          return realXhr.getResponseHeader(header);
        },

        overrideMimeType(mime: string) {
          return realXhr.overrideMimeType(mime);
        },

        addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: any) {
          userListeners.push({ type, listener, options });
        },

        removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
          const idx = userListeners.findIndex((e) => e.type === type && e.listener === listener);
          if (idx !== -1) userListeners.splice(idx, 1);
        },

        dispatchEvent(event: Event) {
          dispatchToUser(event);
          return !event.defaultPrevented;
        },
      };

      Object.setPrototypeOf(proxy, RealXMLHttpRequest.prototype);
      return proxy;
    }

    const ProxiedXMLHttpRequest = function (this: any) {
      return createProxiedXHR();
    } as any;

    ProxiedXMLHttpRequest.prototype = RealXMLHttpRequest.prototype;
    Object.assign(ProxiedXMLHttpRequest, RealXMLHttpRequest);

    window.XMLHttpRequest = ProxiedXMLHttpRequest;
  },
});
