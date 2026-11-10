import React, { useState } from 'react';
import {
  Clock,
  Plus,
  Trash2,
  Power,
  Sliders,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Zap,
} from 'lucide-react';
import { LatencyRule } from '../utils/types';

interface LatencyThrottleTabProps {
  rules: LatencyRule[];
  onUpdateRules: (rules: LatencyRule[]) => void;
  onNotify?: (message: string) => void;
}

export const LatencyThrottleTab: React.FC<LatencyThrottleTabProps> = ({
  rules,
  onUpdateRules,
  onNotify,
}) => {
  const [newRuleName, setNewRuleName] = useState('');
  const [newPattern, setNewPattern] = useState('');
  const [newDelay, setNewDelay] = useState(1500);
  const [newMockStatus, setNewMockStatus] = useState<number>(0);
  const [showAddForm, setShowAddForm] = useState(false);

  const handleToggleRule = (id: string) => {
    const next = rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
    onUpdateRules(next);
    const toggled = next.find((r) => r.id === id);
    onNotify?.(`Latency rule "${toggled?.name}" is now ${toggled?.enabled ? 'ACTIVE' : 'DISABLED'}`);
  };

  const handleDeleteRule = (id: string) => {
    const next = rules.filter((r) => r.id !== id);
    onUpdateRules(next);
    onNotify?.('Latency rule removed');
  };

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPattern.trim()) return;

    const newRule: LatencyRule = {
      id: 'rule_' + Math.random().toString(36).substring(2, 9),
      name: newRuleName.trim() || `Throttle ${newPattern}`,
      urlPattern: newPattern.trim(),
      delayMs: Number(newDelay) || 0,
      enabled: true,
      mockStatus: newMockStatus > 0 ? newMockStatus : undefined,
    };

    const next = [...rules, newRule];
    onUpdateRules(next);
    onNotify?.(`Created route throttle rule: ${newRule.name} (+${newRule.delayMs}ms)`);

    setNewRuleName('');
    setNewPattern('');
    setNewDelay(1500);
    setNewMockStatus(0);
    setShowAddForm(false);
  };

  const handleQuickPreset = (preset: { name: string; pattern: string; delay: number; status?: number }) => {
    const newRule: LatencyRule = {
      id: 'rule_' + Math.random().toString(36).substring(2, 9),
      name: preset.name,
      urlPattern: preset.pattern,
      delayMs: preset.delay,
      enabled: true,
      mockStatus: preset.status,
    };
    const next = [...rules, newRule];
    onUpdateRules(next);
    onNotify?.(`Added quick throttle: ${preset.name}`);
  };

  const activeCount = rules.filter((r) => r.enabled).length;

  return (
    <div className="flex flex-col h-full overflow-y-auto space-y-5 p-4 text-slate-200">
      {/* Top Banner */}
      <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-slate-900 to-indigo-950/60 border border-indigo-900/40 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">Route-Level Latency Throttle</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Add synthetic delay or mock errors to specific API endpoints without throttling the entire browser!
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold font-mono ${
              activeCount > 0
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {activeCount} Active
          </span>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Rule</span>
          </button>
        </div>
      </div>

      {/* Quick Add Presets */}
      <div>
        <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-2">
          Quick Throttle & Error Presets
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            onClick={() =>
              handleQuickPreset({
                name: 'Slow All APIs (+2000ms)',
                pattern: '*/api/*',
                delay: 2000,
              })
            }
            className="p-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/40 rounded-xl text-left transition-all text-xs"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-slate-200">All APIs Delay</span>
              <span className="text-[10px] font-mono text-amber-400 font-bold">+2000ms</span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">*/api/*</p>
          </button>

          <button
            onClick={() =>
              handleQuickPreset({
                name: 'Simulate 500 Server Error',
                pattern: '*checkout*',
                delay: 800,
                status: 500,
              })
            }
            className="p-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-rose-500/40 rounded-xl text-left transition-all text-xs"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-rose-300">500 Server Chaos</span>
              <span className="text-[10px] font-mono text-rose-400 font-bold">500 ERR</span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">*checkout*</p>
          </button>

          <button
            onClick={() =>
              handleQuickPreset({
                name: 'Simulate 429 Rate Limit',
                pattern: '*auth*',
                delay: 1200,
                status: 429,
              })
            }
            className="p-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/40 rounded-xl text-left transition-all text-xs"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-amber-300">429 Rate Limit</span>
              <span className="text-[10px] font-mono text-amber-400 font-bold">429 LIMIT</span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">*auth*</p>
          </button>
        </div>
      </div>

      {/* Add New Rule Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddRule}
          className="p-4 bg-slate-900 rounded-xl border border-indigo-500/40 space-y-3.5 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-white">Create Custom Latency & Mock Rule</h4>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-white text-xs"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Rule Name
              </label>
              <input
                type="text"
                value={newRuleName}
                onChange={(e) => setNewRuleName(e.target.value)}
                placeholder="e.g. Slow Profile Service"
                className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                URL Pattern / Substring / Glob
              </label>
              <input
                type="text"
                required
                value={newPattern}
                onChange={(e) => setNewPattern(e.target.value)}
                placeholder="e.g. */users* or /api/v1/data"
                className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-slate-400">
                  Synthetic Latency: {newDelay} ms
                </label>
                <div className="flex gap-1">
                  {[500, 1500, 3000, 5000].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setNewDelay(d)}
                      className="px-1.5 py-0.5 text-[10px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono"
                    >
                      {d >= 1000 ? `${d / 1000}s` : `${d}ms`}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="10000"
                step="100"
                value={newDelay}
                onChange={(e) => setNewDelay(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Synthetic Mock Status (Optional Chaos Error)
              </label>
              <select
                value={newMockStatus}
                onChange={(e) => setNewMockStatus(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value={0}>Pass through (Normal real status code)</option>
                <option value={400}>400 Bad Request</option>
                <option value={401}>401 Unauthorized</option>
                <option value={403}>403 Forbidden</option>
                <option value={404}>404 Not Found</option>
                <option value={429}>429 Too Many Requests (Rate limit)</option>
                <option value={500}>500 Internal Server Error</option>
                <option value={502}>502 Bad Gateway</option>
                <option value={504}>504 Gateway Timeout</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 font-semibold text-xs text-white rounded-lg transition-colors shadow-sm"
          >
            Save & Activate Latency Rule
          </button>
        </form>
      )}

      {/* Rules List */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300">Configured Route Rules</span>
          <span className="text-[11px] text-slate-500 font-mono">{rules.length} total</span>
        </div>

        {rules.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/60 rounded-xl border border-slate-800 text-slate-500 text-xs">
            <Sliders className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
            <p className="font-medium text-slate-400">No route latency rules configured.</p>
            <p className="text-[11px] mt-1 text-slate-500">
              Click "+ New Rule" or choose a quick preset above to simulate slow endpoints.
            </p>
          </div>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                rule.enabled
                  ? 'bg-slate-900 border-indigo-900/60 shadow-sm'
                  : 'bg-slate-950/60 border-slate-800/80 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => handleToggleRule(rule.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    rule.enabled
                      ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                      : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                  }`}
                  title={rule.enabled ? 'Click to disable' : 'Click to enable'}
                >
                  <Power className="w-4 h-4" />
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-200 truncate">
                      {rule.name}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      +{rule.delayMs}ms
                    </span>
                    {rule.mockStatus && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {rule.mockStatus} MOCK
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[11px] text-indigo-300/90 truncate block mt-0.5">
                    {rule.urlPattern}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleDeleteRule(rule.id)}
                className="p-1.5 rounded-md text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors shrink-0"
                title="Delete rule"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

