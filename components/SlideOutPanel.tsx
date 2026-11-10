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

function isExtensionValid(): boolean {
  try {
    return Boolean(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id);
  } catch {
    return false;
  }
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
      {/* Toast Notification Banner (Solid, No Gradient) */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000000] px-4 py-2 bg-app-surface text-app-text text-xs font-sans rounded-md shadow-lg border border-app-border flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <Sparkles className="w-3.5 h-3.5 text-app-warning shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Floating Trigger Dock Button (Solid, No Gradient) */}
      {!isOpen && (
        <button
          onClick={onToggleOpen}
          className="fixed bottom-6 right-6 z-[9999999] flex items-center gap-2.5 px-3.5 py-2.5 bg-app-bg hover:bg-app-surface text-app-text rounded-lg shadow-xl border border-app-border transition-all hover:border-app-border-focus font-sans"
          title="Open Dev Mock & Chaos Testing Palette | APITrace"
        >
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded flex items-center justify-center bg-app-primary text-white text-[11px] font-bold">
              ⚡
            </span>
            <span className="text-xs font-bold tracking-tight text-app-text">
              DevMock &amp; Trace
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-mono pl-2 border-l border-app-border">
            {activeRulesCount > 0 && (
              <span className="px-1.5 py-0.2 rounded bg-app-warning-muted text-app-warning text-[10px] font-bold">
                {activeRulesCount} throttled
              </span>
            )}
            <span className="px-1.5 py-0.5 rounded bg-app-elevated text-app-text text-[10px] font-bold">
              {requests.length}
            </span>
          </div>
        </button>
      )}

      {/* Slide-Out Drawer Panel (Flat, Solid Architecture) */}
      {isOpen && (
        <div
          className={`fixed top-0 right-0 h-full z-[9999999] bg-app-bg text-app-text shadow-2xl border-l border-app-border flex flex-col font-sans transition-all duration-150 ${
            isFullWidth ? 'w-full sm:w-[94vw]' : 'w-full sm:w-[680px]'
          }`}
          style={{ maxWidth: '100vw' }}
        >
          {/* Main Top Header (Solid, No Gradient) */}
          <div className="p-3.5 bg-app-surface border-b border-app-border flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded flex items-center justify-center bg-app-primary text-white text-xs font-bold">
                ⚡
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold tracking-tight text-app-text uppercase">
                    Dev Mock &amp; Chaos Palette
                  </h2>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-app-elevated text-app-muted border border-app-border font-mono font-medium">
                    APITrace
                  </span>
                </div>
                <p className="text-[11px] text-app-muted">
                  UI stress tester, empty fallback simulator &amp; API monitor
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {!isExtensionValid() && (
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-app-warning-muted text-app-warning border border-app-warning/40"
                  title="Extension was reloaded in developer mode. Refresh this tab (F5) to re-sync."
                >
                  ⚠️ Refresh Tab (F5)
                </span>
              )}
              <button
                onClick={() => setIsFullWidth(!isFullWidth)}
                className="p-1.5 rounded text-app-muted hover:text-app-text hover:bg-app-elevated transition-colors"
                title={isFullWidth ? 'Collapse width' : 'Expand full width'}
              >
                {isFullWidth ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={onToggleOpen}
                className="p-1.5 rounded text-app-muted hover:text-app-text hover:bg-app-elevated transition-colors"
                title="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation Tab Bar (Solid, High-Contrast) */}
          <div className="flex items-center justify-between px-3 bg-app-surface border-b border-app-border text-xs">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('chaos')}
                className={`flex items-center gap-1.5 py-2.5 px-3 font-semibold transition-all ${
                  activeTab === 'chaos'
                    ? 'border-b-2 border-app-danger text-app-text bg-app-elevated/40'
                    : 'border-b-2 border-transparent text-app-muted hover:text-app-text'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-app-danger" />
                <span>Chaos Testing</span>
              </button>

              <button
                onClick={() => setActiveTab('latency')}
                className={`flex items-center gap-1.5 py-2.5 px-3 font-semibold transition-all ${
                  activeTab === 'latency'
                    ? 'border-b-2 border-app-warning text-app-text bg-app-elevated/40'
                    : 'border-b-2 border-transparent text-app-muted hover:text-app-text'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-app-warning" />
                <span>Route Latency</span>
                {activeRulesCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded font-mono text-[10px] font-bold bg-app-warning-muted text-app-warning">
                    {activeRulesCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('apitrace')}
                className={`flex items-center gap-1.5 py-2.5 px-3 font-semibold transition-all ${
                  activeTab === 'apitrace'
                    ? 'border-b-2 border-app-primary text-app-text bg-app-elevated/40'
                    : 'border-b-2 border-transparent text-app-muted hover:text-app-text'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-app-primary" />
                <span>APITrace</span>
                <span className="px-1.5 py-0.2 rounded font-mono text-[10px] font-bold bg-app-elevated text-app-text">
                  {requests.length}
                </span>
              </button>
            </div>
          </div>

          {/* Active Tab Body */}
          <div className="flex-1 overflow-hidden relative bg-app-bg">
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
