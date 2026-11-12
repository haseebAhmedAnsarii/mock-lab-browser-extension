import React, { useState, useEffect } from 'react';
import {
  Flame,
  Activity,
  Clock,
  RotateCcw,
  EyeOff,
  ImageOff,
  Layers,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export default function App() {
  const [stats, setStats] = useState({
    requestCount: 0,
    activeRulesCount: 0,
    domStats: { textNodes: 0, images: 0, lists: 0 },
    isOpen: false,
  });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchTabStats = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_PAGE_STATS' }, (res) => {
          if (chrome.runtime.lastError) {
            return;
          }
          if (res) {
            setStats(res);
          }
        });
      }
    });
  };

  useEffect(() => {
    fetchTabStats();
  }, []);

  const sendTabMessage = (msg: any, successFeedback: string) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) return;
      chrome.tabs.sendMessage(tabs[0].id, msg, (res) => {
        if (chrome.runtime.lastError) {
          setStatusMessage('Please refresh the page to activate extension.');
          return;
        }
        setStatusMessage(successFeedback);
        fetchTabStats();
        setTimeout(() => setStatusMessage(null), 2500);
      });
    });
  };

  const handleTogglePanel = () => {
    sendTabMessage({ type: 'TOGGLE_PANEL' }, 'Toggled in-page slide-out panel');
  };

  const handleSimulateEmptyLists = () => {
    sendTabMessage({ type: 'SIMULATE_EMPTY' }, 'Emptied page lists & grids');
  };

  const handleSimulateBrokenImages = () => {
    sendTabMessage({ type: 'SIMULATE_BROKEN_IMAGES' }, 'Simulated broken image fallbacks');
  };

  const handleRevertAll = () => {
    sendTabMessage({ type: 'REVERT_ALL' }, 'Restored original page DOM snapshot');
  };

  const totalModifications =
    stats.domStats.textNodes + stats.domStats.images + stats.domStats.lists;

  return (
    <div className="dm-popup-root flex flex-col bg-app-bg text-app-text p-4 space-y-4 font-sans select-none">
      {/* Header (Solid Flat, No Gradients) */}
      <div className="dm-popup-header flex items-center justify-between pb-3 border-b border-app-border">
        <div className="dm-popup-header-brand flex items-center gap-2">
          <span className="dm-popup-logo-icon w-6 h-6 rounded flex items-center justify-center bg-app-primary text-white text-xs font-bold">
            ⚡
          </span>
          <div className="dm-popup-title-group">
            <h1 className="dm-popup-title text-xs font-bold uppercase tracking-wider text-app-text">
              Dev Mock &amp; Chaos
            </h1>
            <p className="dm-popup-subtitle text-[10px] text-app-muted font-mono">APITrace v1.0.0</p>
          </div>
        </div>

        <span className="dm-popup-status-badge flex items-center gap-1.5 text-[10px] text-app-success bg-app-success-muted border border-app-success/40 px-2 py-0.5 rounded font-mono font-bold">
          <span className="dm-popup-status-dot w-1.5 h-1.5 rounded-full bg-app-success" />
          <span className="dm-popup-status-label">Active</span>
        </span>
      </div>

      {/* Feedback Toast */}
      {statusMessage && (
        <div className="dm-popup-toast p-2 bg-app-surface border border-app-border-focus rounded text-[11px] text-app-text text-center">
          {statusMessage}
        </div>
      )}

      {/* Big Launch Slide-Out Button (Solid High-Contrast, No Gradients) */}
      <button
        onClick={handleTogglePanel}
        className="dm-popup-launch-btn w-full py-2.5 px-3 bg-app-text hover:bg-white text-app-bg rounded text-xs font-bold flex items-center justify-between transition-colors shadow-sm"
      >
        <span className="dm-popup-launch-btn-label flex items-center gap-2">
          <Layers className="dm-popup-launch-btn-icon w-4 h-4" />
          <span className="dm-popup-launch-btn-text">{stats.isOpen ? 'Close Slide-Out Drawer' : 'Launch In-Page Slide-Out'}</span>
        </span>
        <ChevronRight className="dm-popup-launch-btn-chevron w-4 h-4" />
      </button>

      {/* Real-time stats */}
      <div className="dm-popup-stats-grid grid grid-cols-3 gap-2 text-center">
        <div className="dm-popup-stat-card dm-popup-stat-captured p-2.5 bg-app-surface border border-app-border rounded">
          <span className="dm-popup-stat-value block text-base font-bold font-mono text-app-primary">
            {stats.requestCount}
          </span>
          <span className="dm-popup-stat-label text-[10px] text-app-muted font-medium">Captured</span>
        </div>

        <div className="dm-popup-stat-card dm-popup-stat-throttles p-2.5 bg-app-surface border border-app-border rounded">
          <span className="dm-popup-stat-value block text-base font-bold font-mono text-app-warning">
            {stats.activeRulesCount}
          </span>
          <span className="dm-popup-stat-label text-[10px] text-app-muted font-medium">Throttles</span>
        </div>

        <div className="dm-popup-stat-card dm-popup-stat-chaos p-2.5 bg-app-surface border border-app-border rounded">
          <span className="dm-popup-stat-value block text-base font-bold font-mono text-app-danger">
            {totalModifications}
          </span>
          <span className="dm-popup-stat-label text-[10px] text-app-muted font-medium">DOM Chaos</span>
        </div>
      </div>

      {/* Quick Chaos Actions */}
      <div className="dm-popup-chaos-section space-y-2">
        <span className="dm-popup-chaos-heading text-[10px] font-bold text-app-muted uppercase tracking-wider block">
          One-Click Stress Actions
        </span>

        <div className="dm-popup-chaos-actions-grid grid grid-cols-2 gap-2">
          <button
            onClick={handleSimulateEmptyLists}
            className="dm-popup-chaos-empty-btn flex items-center gap-2 p-2 bg-app-surface hover:bg-app-elevated border border-app-border rounded text-left transition-colors text-xs text-app-text"
          >
            <EyeOff className="dm-popup-chaos-empty-icon w-3.5 h-3.5 text-app-warning shrink-0" />
            <span className="dm-popup-chaos-empty-label truncate">Empty Lists</span>
          </button>

          <button
            onClick={handleSimulateBrokenImages}
            className="dm-popup-chaos-broken-btn flex items-center gap-2 p-2 bg-app-surface hover:bg-app-elevated border border-app-border rounded text-left transition-colors text-xs text-app-text"
          >
            <ImageOff className="dm-popup-chaos-broken-icon w-3.5 h-3.5 text-app-danger shrink-0" />
            <span className="dm-popup-chaos-broken-label truncate">Break Images</span>
          </button>
        </div>

        <button
          onClick={handleRevertAll}
          disabled={totalModifications === 0}
          className={`dm-popup-revert-btn w-full flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-bold border transition-all ${
            totalModifications > 0
              ? 'bg-app-danger-muted text-app-danger border-app-danger/40 hover:bg-app-danger/20'
              : 'bg-app-surface text-app-faint border-app-border cursor-not-allowed'
          }`}
        >
          <RotateCcw className="dm-popup-revert-icon w-3.5 h-3.5" />
          <span className="dm-popup-revert-label">Restore Original DOM ({totalModifications})</span>
        </button>
      </div>

      {/* Security & Privacy Footer */}
      <div className="dm-popup-footer pt-2 border-t border-app-border flex items-center justify-between text-[10px] text-app-muted">
        <span className="dm-popup-privacy-status flex items-center gap-1">
          <ShieldCheck className="dm-popup-privacy-icon w-3 h-3 text-app-success" />
          <span className="dm-popup-privacy-label">Bearer/Cookie Masking Active</span>
        </span>
        <span className="dm-popup-mv3-badge font-mono">MV3</span>
      </div>
    </div>
  );
}
