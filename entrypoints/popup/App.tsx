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
  Zap,
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
            // Content script might not be injected on chrome:// or restricted pages
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
    <div className="flex flex-col bg-slate-950 text-slate-100 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-tr from-indigo-600 to-rose-500 text-white shadow-md">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xs font-bold uppercase tracking-wider text-white">
              Dev Mock & Chaos
            </h1>
            <p className="text-[10px] text-indigo-400 font-mono">APITrace v1.0.0</p>
          </div>
        </div>

        <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-full font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Active
        </span>
      </div>

      {/* Feedback Toast */}
      {statusMessage && (
        <div className="p-2 bg-indigo-950 border border-indigo-700/60 rounded-lg text-[11px] text-indigo-200 text-center animate-in fade-in duration-150">
          {statusMessage}
        </div>
      )}

      {/* Big Launch Slide-Out Button */}
      <button
        onClick={handleTogglePanel}
        className="w-full py-2.5 px-3 bg-gradient-to-r from-indigo-600 to-rose-600 hover:from-indigo-500 hover:to-rose-500 text-white rounded-xl text-xs font-semibold flex items-center justify-between shadow-lg shadow-indigo-950 transition-all hover:scale-[1.01]"
      >
        <span className="flex items-center gap-2">
          <Layers className="w-4 h-4" />
          <span>{stats.isOpen ? 'Close Slide-Out Drawer' : 'Launch In-Page Slide-Out'}</span>
        </span>
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Real-time stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg">
          <span className="block text-base font-bold font-mono text-indigo-400">
            {stats.requestCount}
          </span>
          <span className="text-[10px] text-slate-400">Captured APIs</span>
        </div>

        <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg">
          <span className="block text-base font-bold font-mono text-amber-400">
            {stats.activeRulesCount}
          </span>
          <span className="text-[10px] text-slate-400">Throttles</span>
        </div>

        <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg">
          <span className="block text-base font-bold font-mono text-rose-400">
            {totalModifications}
          </span>
          <span className="text-[10px] text-slate-400">DOM Chaos</span>
        </div>
      </div>

      {/* Quick Chaos Actions */}
      <div className="space-y-2">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
          One-Click Stress & Mock Actions
        </span>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleSimulateEmptyLists}
            className="flex items-center gap-2 p-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/50 rounded-lg text-left transition-colors text-xs text-slate-300"
          >
            <EyeOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">Empty Lists</span>
          </button>

          <button
            onClick={handleSimulateBrokenImages}
            className="flex items-center gap-2 p-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-rose-500/50 rounded-lg text-left transition-colors text-xs text-slate-300"
          >
            <ImageOff className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="truncate">Break Images</span>
          </button>
        </div>

        <button
          onClick={handleRevertAll}
          disabled={totalModifications === 0}
          className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            totalModifications > 0
              ? 'bg-rose-950/40 text-rose-300 border-rose-800/60 hover:bg-rose-900/40'
              : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restore Original DOM ({totalModifications})</span>
        </button>
      </div>

      {/* Security & Privacy Footer */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>Bearer/Cookie Masking Active</span>
        </span>
        <span>Manifest V3</span>
      </div>
    </div>
  );
}

