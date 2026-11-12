import React, { useState } from 'react';
import {
  Clock,
  Plus,
  Trash2,
  Power,
  Sliders,
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
    <div className="flex flex-col h-full overflow-y-auto space-y-4 p-4 text-app-text">
      {/* Top Banner (Solid Flat Background, No Gradients) */}
      <div className="flex items-center justify-between p-3.5 bg-app-surface border border-app-border rounded-lg">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-app-warning" />
            <h3 className="text-xs font-bold uppercase tracking-tight text-app-text">
              Route-Level Latency Throttle
            </h3>
          </div>
          <p className="text-xs text-app-muted mt-0.5">
            Add synthetic delay or mock errors to specific API endpoints without throttling the entire browser!
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded text-xs font-bold font-mono border ${
              activeCount > 0
                ? 'bg-app-warning-muted text-app-warning border-app-warning/40'
                : 'bg-app-elevated text-app-muted border-app-border'
            }`}
          >
            {activeCount} Active
          </span>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-app-primary hover:bg-app-primary-hover text-white transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Rule</span>
          </button>
        </div>
      </div>

      {/* Quick Add Presets (Solid Cards) */}
      <div>
        <span className="text-[11px] font-bold text-app-muted uppercase tracking-wider block mb-2">
          Quick Throttle &amp; Error Presets
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            onClick={() =>
              handleQuickPreset({
                name: 'Slow Users API (+2000ms)',
                pattern: '*users*',
                delay: 2000,
              })
            }
            className="p-2.5 bg-app-surface hover:bg-app-elevated border border-app-border hover:border-app-border-focus rounded-lg text-left transition-all text-xs"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-app-text">Users API Delay</span>
              <span className="text-[10px] font-mono text-app-warning font-bold">+2000ms</span>
            </div>
            <p className="text-[11px] text-app-muted font-mono">*users*</p>
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
            className="p-2.5 bg-app-surface hover:bg-app-elevated border border-app-border hover:border-app-border-focus rounded-lg text-left transition-all text-xs"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-app-danger">500 Server Chaos</span>
              <span className="text-[10px] font-mono text-app-danger font-bold">500 ERR</span>
            </div>
            <p className="text-[11px] text-app-muted font-mono">*checkout*</p>
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
            className="p-2.5 bg-app-surface hover:bg-app-elevated border border-app-border hover:border-app-border-focus rounded-lg text-left transition-all text-xs"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-app-warning">429 Rate Limit</span>
              <span className="text-[10px] font-mono text-app-warning font-bold">429 LIMIT</span>
            </div>
            <p className="text-[11px] text-app-muted font-mono">*auth*</p>
          </button>
        </div>
      </div>

      {/* Add New Rule Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddRule}
          className="p-4 bg-app-surface rounded-lg border border-app-border-focus space-y-3.5"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-app-text uppercase">Create Route Rule</h4>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-app-muted hover:text-app-text text-xs"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-app-muted block mb-1">
                Rule Name
              </label>
              <input
                type="text"
                value={newRuleName}
                onChange={(e) => setNewRuleName(e.target.value)}
                placeholder="e.g. Slow Profile Service"
                className="w-full px-3 py-1.5 text-xs bg-app-bg border border-app-border rounded text-app-text focus:outline-none focus:border-app-border-focus"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-app-muted block mb-1">
                URL Pattern / Substring / Glob
              </label>
              <input
                type="text"
                required
                value={newPattern}
                onChange={(e) => setNewPattern(e.target.value)}
                placeholder="e.g. */users* or /api/v1/data"
                className="w-full px-3 py-1.5 text-xs bg-app-bg border border-app-border rounded text-app-text font-mono focus:outline-none focus:border-app-border-focus"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-app-muted">
                  Synthetic Latency: {newDelay} ms
                </label>
                <div className="flex gap-1">
                  {[500, 1500, 3000, 5000].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setNewDelay(d)}
                      className="px-1.5 py-0.5 text-[10px] rounded bg-app-bg hover:bg-app-elevated text-app-text font-mono border border-app-border"
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
                className="w-full accent-app-primary"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-app-muted block mb-1">
                Synthetic Mock Status (Optional)
              </label>
              <select
                value={newMockStatus}
                onChange={(e) => setNewMockStatus(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs bg-app-bg border border-app-border rounded text-app-text focus:outline-none focus:border-app-border-focus"
              >
                <option value={0}>Pass through (Real response)</option>
                <option value={400}>400 Bad Request</option>
                <option value={401}>401 Unauthorized</option>
                <option value={403}>403 Forbidden</option>
                <option value={404}>404 Not Found</option>
                <option value={429}>429 Too Many Requests</option>
                <option value={500}>500 Internal Server Error</option>
                <option value={502}>502 Bad Gateway</option>
                <option value={504}>504 Gateway Timeout</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-app-primary hover:bg-app-primary-hover font-semibold text-xs text-white rounded transition-colors"
          >
            Save &amp; Activate Latency Rule
          </button>
        </form>
      )}

      {/* Rules List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-app-text">Configured Route Rules</span>
          <span className="text-[11px] text-app-muted font-mono">{rules.length} total</span>
        </div>

        {rules.length === 0 ? (
          <div className="p-8 text-center bg-app-surface rounded-lg border border-app-border text-app-muted text-xs">
            <Sliders className="w-8 h-8 mx-auto mb-2 opacity-40 text-app-faint" />
            <p className="font-semibold text-app-text">No route latency rules configured.</p>
            <p className="text-[11px] mt-1 text-app-muted">
              Click "+ New Rule" or choose a quick preset above.
            </p>
          </div>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              className={`p-3.5 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                rule.enabled
                  ? 'bg-app-surface border-app-border'
                  : 'bg-app-bg border-app-border/60 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => handleToggleRule(rule.id)}
                  className={`p-2 rounded transition-colors border ${
                    rule.enabled
                      ? 'bg-app-success-muted text-app-success border-app-success/40'
                      : 'bg-app-bg text-app-muted border-app-border'
                  }`}
                  title={rule.enabled ? 'Click to disable' : 'Click to enable'}
                >
                  <Power className="w-4 h-4" />
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-app-text truncate">
                      {rule.name}
                    </span>
                    <span className="px-2 py-0.2 rounded text-[10px] font-mono font-bold bg-app-warning-muted text-app-warning border border-app-warning/40">
                      +{rule.delayMs}ms
                    </span>
                    {rule.mockStatus && (
                      <span className="px-2 py-0.2 rounded text-[10px] font-mono font-bold bg-app-danger-muted text-app-danger border border-app-danger/40">
                        {rule.mockStatus} MOCK
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[11px] text-app-muted truncate block mt-0.5">
                    {rule.urlPattern}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleDeleteRule(rule.id)}
                className="p-1.5 rounded text-app-muted hover:text-app-danger hover:bg-app-elevated transition-colors shrink-0"
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
