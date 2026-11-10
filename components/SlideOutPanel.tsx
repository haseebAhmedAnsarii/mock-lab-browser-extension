import React, { useState, useEffect } from 'react';
import {
  Flame,
  Clock,
  Activity,
  X,
  Minimize2,
  Maximize2,
  ChevronRight,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';
import { CapturedRequest, LatencyRule } from '../utils/types';
import { ChaosPaletteTab } from './ChaosPaletteTab';
import { LatencyThrottleTab } from './LatencyThrottleTab';
import { ApiTraceTab } from './ApiTraceTab';

interface SlideOutPanelProps {
  requests: CapturedRequest[];
  isRecording: boolean;
  onToggleRecording: () => void;
  onClearRequests: () => void;
  rules: LatencyRule[];
  onUpdateRules: (rules: LatencyRule[]) => void;
  onReplayRequest?: (req: CapturedRequest) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const SlideOutPanel: React.FC<SlideOutPanelProps> = ({
  requests,
  isRecording,
  onToggleRecording,
  onClearRequests,
  rules,
  onUpdateRules,
  onReplayRequest,
  isOpen,
  onToggleOpen,
}) => {
  const [activeTab, setActiveTab] = useState<'chaos' | 'latency' | 'apitrace'>('chaos');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isFullWidth, setIsFullWidth] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 3200);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const activeRulesCount = rules.filter((r) => r.enabled).length;

  return (
    <>
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000000] px-4 py-2 bg-slate-900/95 text-white text-xs font-sans rounded-full shadow-2xl border border-indigo-500/50 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Floating Trigger Dock Button (Visible when closed) */}
      {!isOpen && (
        <button
          onClick={onToggleOpen}
          className="fixed bottom-6 right-6 z-[9999999] flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-950/95 hover:bg-slate-900 text-white rounded-full shadow-2xl border border-indigo-500/40 hover:border-indigo-400 transition-all hover:scale-105 group font-sans backdrop-blur-md"
          title="Open Dev Mock & Chaos Testing Palette | APITrace"
        >
          <div className="flex items-center gap-1.5">
            <span className="p-1 rounded-full bg-rose-500/20 text-rose-400 group-hover:rotate-12 transition-transform">
              <Flame className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-bold tracking-tight bg-gradient-to-r from-indigo-300 to-rose-300 bg-clip-text text-transparent">
              DevMock & Trace
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-mono pl-1 border-l border-slate-800">
            {activeRulesCount > 0 && (
              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                {activeRulesCount} throttled
              </span>
            )}
            <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
              {requests.length}
            </span>
          </div>
        </button>
      )}

      {/* Slide-Out Drawer Panel */}
      {isOpen && (
        <div
          className={`fixed top-0 right-0 h-full z-[9999999] bg-slate-950 text-slate-100 shadow-2xl border-l border-slate-800 flex flex-col font-sans transition-all duration-200 ${
            isFullWidth ? 'w-full sm:w-[92vw]' : 'w-full sm:w-[680px]'
          }`}
          style={{ maxWidth: '100vw' }}
        >
          {/* Main Top Header */}
          <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-gradient-to-tr from-indigo-600 to-rose-500 text-white shadow-md">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold tracking-tight text-white uppercase">
                    Dev Mock & Chaos Palette
                  </h2>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                    APITrace
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  UI stress tester, empty fallback simulator & API debugger
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsFullWidth(!isFullWidth)}
                className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title={isFullWidth ? 'Collapse width' : 'Expand full width'}
              >
                {isFullWidth ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={onToggleOpen}
                className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation Tab Bar */}
          <div className="flex items-center justify-between px-3 bg-slate-900/90 border-b border-slate-800 text-xs">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('chaos')}
                className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 font-semibold transition-all ${
                  activeTab === 'chaos'
                    ? 'border-rose-500 text-white bg-slate-800/40'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-rose-500" />
                <span>Chaos Testing</span>
              </button>

              <button
                onClick={() => setActiveTab('latency')}
                className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 font-semibold transition-all ${
                  activeTab === 'latency'
                    ? 'border-amber-500 text-white bg-slate-800/40'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Route Latency</span>
                {activeRulesCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-mono">
                    {activeRulesCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('apitrace')}
                className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 font-semibold transition-all ${
                  activeTab === 'apitrace'
                    ? 'border-indigo-500 text-white bg-slate-800/40'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                <span>APITrace</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300 font-mono">
                  {requests.length}
                </span>
              </button>
            </div>
          </div>

          {/* Active Tab Body */}
          <div className="flex-1 overflow-hidden relative">
            {activeTab === 'chaos' && <ChaosPaletteTab onNotify={showToast} />}
            {activeTab === 'latency' && (
              <LatencyThrottleTab
                rules={rules}
                onUpdateRules={onUpdateRules}
                onNotify={showToast}
              />
            )}
            {activeTab === 'apitrace' && (
              <ApiTraceTab
                requests={requests}
                isRecording={isRecording}
                onToggleRecording={onToggleRecording}
                onClearRequests={onClearRequests}
                onReplayRequest={onReplayRequest}
                onNotify={showToast}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
};

