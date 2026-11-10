import { defineContentScript } from 'wxt/utils/define-content-script';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { SlideOutPanel } from '../../components/SlideOutPanel';
import { CapturedRequest, LatencyRule } from '../../utils/types';
import { domChaos } from '../../utils/dom-chaos';
import './style.css';

// Default latency rules
const DEFAULT_RULES: LatencyRule[] = [
  {
    id: 'default_api_throttle',
    name: 'Slow Mock API (/api/*)',
    urlPattern: '*/api/*',
    delayMs: 1500,
    enabled: false,
  },
];

/**
 * Checks whether the extension context is still alive.
 * In Chrome, reloading the extension in chrome://extensions invalidates existing tabs
 * until the page is refreshed.
 */
function isExtensionValid(): boolean {
  try {
    return Boolean(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id);
  } catch {
    return false;
  }
}

function safeSendMessage(message: any): Promise<any> {
  if (!isExtensionValid()) {
    return Promise.resolve();
  }
  try {
    return chrome.runtime.sendMessage(message).catch(() => {});
  } catch {
    return Promise.resolve();
  }
}

function safeStorageSet(items: Record<string, any>): void {
  if (!isExtensionValid()) return;
  try {
    chrome.storage.local.set(items);
  } catch {
    // Context invalidated, ignore safely
  }
}

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    // 1. Inject the page-world interceptor for fetch and XHR
    injectPageScript();

    // 2. Mount Shadow DOM UI
    const ui = await createShadowRootUi(ctx, {
      name: 'dev-chaos-apitrace-root',
      position: 'overlay',
      anchor: 'body',
      append: 'last',
      onMount: (uiContainer, shadowRoot) => {
        const root = ReactDOM.createRoot(uiContainer);
        root.render(<ContentApp />);
        return root;
      },
      onRemove: (root) => {
        root?.unmount();
      },
    });

    ui.mount();
  },
});

function injectPageScript() {
  if (!isExtensionValid()) return;
  try {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected.js');
    script.async = false;
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
  } catch (err) {
    // Extension might be reloading
  }
}

const ContentApp: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [requests, setRequests] = useState<CapturedRequest[]>([]);
  const [rules, setRules] = useState<LatencyRule[]>(DEFAULT_RULES);
  const [isRecording, setIsRecording] = useState(true);

  // Load persisted latency rules from Chrome storage safely
  useEffect(() => {
    if (!isExtensionValid()) return;
    try {
      chrome.storage.local.get(['chaos_latency_rules', 'chaos_panel_open'], (res) => {
        if (!isExtensionValid()) return;
        if (res?.chaos_latency_rules && Array.isArray(res.chaos_latency_rules)) {
          setRules(res.chaos_latency_rules);
          broadcastConfig(res.chaos_latency_rules, isRecording);
        }
        if (typeof res?.chaos_panel_open === 'boolean') {
          setIsOpen(res.chaos_panel_open);
        }
      });
    } catch {
      // Ignore context invalidation
    }
  }, []);

  const broadcastConfig = (currentRules: LatencyRule[], recording: boolean) => {
    try {
      window.dispatchEvent(
        new CustomEvent('__DEV_CHAOS_CONFIG_EVENT__', {
          detail: {
            rules: currentRules,
            monitoringEnabled: recording,
          },
        })
      );
    } catch {
      // Ignore
    }
  };

  const handleUpdateRules = (updatedRules: LatencyRule[]) => {
    setRules(updatedRules);
    safeStorageSet({ chaos_latency_rules: updatedRules });
    broadcastConfig(updatedRules, isRecording);
  };

  const handleToggleRecording = () => {
    const next = !isRecording;
    setIsRecording(next);
    broadcastConfig(rules, next);
  };

  const handleClearRequests = () => {
    setRequests([]);
    safeSendMessage({ type: 'CLEAR_REQUESTS' });
  };

  const handleToggleOpen = () => {
    const next = !isOpen;
    setIsOpen(next);
    safeStorageSet({ chaos_panel_open: next });
  };

  // Listen to intercepted API traffic from injected script
  useEffect(() => {
    const handleTraceEvent = (event: any) => {
      if (!isRecording) return;
      const requestData: CapturedRequest = event.detail;
      if (!requestData) return;

      setRequests((prev) => {
        // Limit to 500 requests
        const next = [requestData, ...prev.slice(0, 499)];
        return next;
      });

      // Update background badge safely
      safeSendMessage({ type: 'REQUEST_CAPTURED', request: requestData });
    };

    window.addEventListener('__DEV_CHAOS_API_TRACE__', handleTraceEvent);
    return () => {
      window.removeEventListener('__DEV_CHAOS_API_TRACE__', handleTraceEvent);
    };
  }, [isRecording]);

  // Listen for messages from popup
  useEffect(() => {
    if (!isExtensionValid()) return;

    const messageListener = (msg: any, _sender: any, sendResponse: (res?: any) => void) => {
      if (!isExtensionValid()) return false;

      if (msg.type === 'TOGGLE_PANEL') {
        handleToggleOpen();
        sendResponse({ success: true, isOpen: !isOpen });
        return true;
      }

      if (msg.type === 'OPEN_PANEL') {
        setIsOpen(true);
        safeStorageSet({ chaos_panel_open: true });
        sendResponse({ success: true });
        return true;
      }

      if (msg.type === 'SIMULATE_EMPTY') {
        const count = domChaos.simulateEmptyLists();
        sendResponse({ count });
        return true;
      }

      if (msg.type === 'SIMULATE_BROKEN_IMAGES') {
        const count = domChaos.simulateBrokenImages();
        sendResponse({ count });
        return true;
      }

      if (msg.type === 'REVERT_ALL') {
        const result = domChaos.revertAll();
        sendResponse(result);
        return true;
      }

      if (msg.type === 'GET_PAGE_STATS') {
        sendResponse({
          requestCount: requests.length,
          activeRulesCount: rules.filter((r) => r.enabled).length,
          domStats: domChaos.getModifiedCounts(),
          isOpen,
        });
        return true;
      }
    };

    try {
      chrome.runtime.onMessage.addListener(messageListener);
      return () => {
        try {
          if (isExtensionValid()) {
            chrome.runtime.onMessage.removeListener(messageListener);
          }
        } catch {
          // Ignore
        }
      };
    } catch {
      // Ignore
    }
  }, [isOpen, requests.length, rules]);

  // Replay request
  const handleReplayRequest = useCallback((req: CapturedRequest) => {
    try {
      fetch(req.url, {
        method: req.method,
        headers: req.requestHeaders,
        body: ['POST', 'PUT', 'PATCH'].includes(req.method.toUpperCase()) ? req.requestBody : undefined,
      }).catch((err) => console.warn('[Dev Mock] Replay failed:', err));
    } catch (e) {
      console.error('[Dev Mock] Failed to initiate replay:', e);
    }
  }, []);

  return (
    <div id="dev-chaos-apitrace-root">
      <SlideOutPanel
        requests={requests}
        isRecording={isRecording}
        onToggleRecording={handleToggleRecording}
        onClearRequests={handleClearRequests}
        rules={rules}
        onUpdateRules={handleUpdateRules}
        onReplayRequest={handleReplayRequest}
        isOpen={isOpen}
        onToggleOpen={handleToggleOpen}
      />
    </div>
  );
};
