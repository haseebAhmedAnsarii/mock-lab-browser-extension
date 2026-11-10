import { defineBackground } from 'wxt/utils/define-background';

export default defineBackground(() => {
  console.log('[Dev Mock & APITrace] Background Service Worker initialized.');

  // Map to track request count per tab
  const tabRequestCounts = new Map<number, number>();

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const tabId = sender.tab?.id;

    if (message.type === 'REQUEST_CAPTURED' && tabId !== undefined) {
      const current = (tabRequestCounts.get(tabId) || 0) + 1;
      tabRequestCounts.set(tabId, current);

      // Update badge on extension icon
      chrome.action.setBadgeText({
        tabId,
        text: current > 999 ? '999+' : String(current),
      });
      chrome.action.setBadgeBackgroundColor({
        tabId,
        color: '#6366f1',
      });
      sendResponse({ success: true, count: current });
      return true;
    }

    if (message.type === 'CLEAR_REQUESTS' && tabId !== undefined) {
      tabRequestCounts.set(tabId, 0);
      chrome.action.setBadgeText({
        tabId,
        text: '',
      });
      sendResponse({ success: true });
      return true;
    }

    if (message.type === 'GET_TAB_COUNT' && tabId !== undefined) {
      sendResponse({ count: tabRequestCounts.get(tabId) || 0 });
      return true;
    }
  });

  // Clean up tab stats on tab close
  chrome.tabs.onRemoved.addListener((tabId) => {
    tabRequestCounts.delete(tabId);
  });
});

