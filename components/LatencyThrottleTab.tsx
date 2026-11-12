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
  const [patternError, setPatternError] = useState('');
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
    const trimmedPattern = newPattern.trim();
    if (!trimmedPattern) return;

    // Ensure URL patterns are strictly unique
    const existing = rules.find(
      (r) => r.urlPattern.trim().toLowerCase() === trimmedPattern.toLowerCase()
    );
    if (existing) {
      setPatternError(`A rule for "${trimmedPattern}" already exists ("${existing.name}").`);
      onNotify?.(`Duplicate pattern: a rule for "${trimmedPattern}" is already configured.`);
      return;
    }

    const newRule: LatencyRule = {
      id: 'rule_' + Math.random().toString(36).substring(2, 9),
      name: newRuleName.trim() || `Throttle ${trimmedPattern}`,
      urlPattern: trimmedPattern,
      delayMs: Number(newDelay) || 0,
      enabled: true,
      mockStatus: newMockStatus > 0 ? newMockStatus : undefined,
    };

    const next = [...rules, newRule];
    onUpdateRules(next);
    onNotify?.(`Created route throttle rule: ${newRule.name} (+${newRule.delayMs}ms)`);

    setNewRuleName('');
    setNewPattern('');
    setPatternError('');
    setNewDelay(1500);
    setNewMockStatus(0);
    setShowAddForm(false);
  };

  const handleQuickPreset = (preset: { name: string; pattern: string; delay: number; status?: number }) => {
    const trimmedPresetPattern = preset.pattern.trim().toLowerCase();
    const existingIndex = rules.findIndex(
      (r) => r.urlPattern.trim().toLowerCase() === trimmedPresetPattern
    );

    if (existingIndex !== -1) {
      // Update and activate existing rule to prevent duplicate pattern entries
      const next = [...rules];
      next[existingIndex] = {
        ...next[existingIndex],
        name: preset.name,
        delayMs: preset.delay,
        mockStatus: preset.status,
        enabled: true,
      };
      onUpdateRules(next);
      onNotify?.(`Rule for "${preset.pattern}" already exists`);
    } else {
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
      onNotify?.(`Added route rule: ${preset.name}`);
    }
  };

  const activeCount = rules.filter((r) => r.enabled).length;

  return (
    <div className="dm-latency-root flex flex-col h-full overflow-y-auto space-y-4 p-4 text-app-text">
      {/* Top Banner (Solid Flat Background, No Gradients) */}
      <div className="dm-latency-banner flex items-center justify-between p-3.5 bg-app-surface border border-app-border rounded-lg">
        <div className="dm-latency-banner-info">
          <div className="dm-latency-banner-title-row flex items-center gap-2">
            <Clock className="dm-latency-banner-icon w-4 h-4 text-app-warning" />
            <h3 className="dm-latency-banner-heading text-xs font-bold uppercase tracking-tight text-app-text">
              Route-Level Latency Throttle
            </h3>
          </div>
          <p className="dm-latency-banner-desc text-xs text-app-muted mt-0.5">
            Add synthetic delay or mock errors to specific API endpoints without throttling the entire browser!
          </p>
        </div>

        <div className="dm-latency-banner-actions flex items-center gap-2">
          <span
            className={`dm-latency-active-badge px-2.5 py-1 rounded text-xs font-bold font-mono border ${
              activeCount > 0
                ? 'bg-app-warning-muted text-app-warning border-app-warning/40'
                : 'bg-app-elevated text-app-muted border-app-border'
            }`}
          >
            {activeCount} Active
          </span>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="dm-latency-new-rule-btn flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-app-primary hover:bg-app-primary-hover text-white transition-colors"
          >
            <Plus className="dm-latency-new-rule-icon w-3.5 h-3.5" />
            <span className="dm-latency-new-rule-label">New Rule</span>
          </button>
        </div>
      </div>

      {/* Quick Add Presets (Solid Cards) */}
      <div className="dm-latency-presets-section">
        <span className="dm-latency-presets-heading text-[11px] font-bold text-app-muted uppercase tracking-wider block mb-2">
          Quick Throttle &amp; Error Presets
        </span>
        <div className="dm-latency-presets-grid grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            onClick={() =>
              handleQuickPreset({
                name: 'Slow Users API (+2000ms)',
                pattern: '*users*',
                delay: 2000,
              })
            }
            className="dm-latency-preset-card p-2.5 bg-app-surface hover:bg-app-elevated border border-app-border hover:border-app-border-focus rounded-lg text-left transition-all text-xs"
          >
            <div className="dm-latency-preset-card-header flex items-center justify-between mb-1">
              <span className="dm-latency-preset-title font-bold text-app-text">Users API Delay</span>
              <span className="dm-latency-preset-delay-badge text-[10px] font-mono text-app-warning font-bold">+2000ms</span>
            </div>
            <p className="dm-latency-preset-pattern text-[11px] text-app-muted font-mono">*users*</p>
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
            className="dm-latency-preset-card p-2.5 bg-app-surface hover:bg-app-elevated border border-app-border hover:border-app-border-focus rounded-lg text-left transition-all text-xs"
          >
            <div className="dm-latency-preset-card-header flex items-center justify-between mb-1">
              <span className="dm-latency-preset-title font-bold text-app-danger">500 Server Chaos</span>
              <span className="dm-latency-preset-delay-badge text-[10px] font-mono text-app-danger font-bold">500 ERR</span>
            </div>
            <p className="dm-latency-preset-pattern text-[11px] text-app-muted font-mono">*checkout*</p>
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
            className="dm-latency-preset-card p-2.5 bg-app-surface hover:bg-app-elevated border border-app-border hover:border-app-border-focus rounded-lg text-left transition-all text-xs"
          >
            <div className="dm-latency-preset-card-header flex items-center justify-between mb-1">
              <span className="dm-latency-preset-title font-bold text-app-warning">429 Rate Limit</span>
              <span className="dm-latency-preset-delay-badge text-[10px] font-mono text-app-warning font-bold">429 LIMIT</span>
            </div>
            <p className="dm-latency-preset-pattern text-[11px] text-app-muted font-mono">*auth*</p>
          </button>
        </div>
      </div>

      {/* Add New Rule Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddRule}
          className="dm-latency-add-form p-4 bg-app-surface rounded-lg border border-app-border-focus space-y-3.5"
        >
          <div className="dm-latency-form-header flex items-center justify-between">
            <h4 className="dm-latency-form-title text-xs font-bold text-app-text uppercase">Create Route Rule</h4>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="dm-latency-form-cancel text-app-muted hover:text-app-text text-xs"
            >
              Cancel
            </button>
          </div>

          <div className="dm-latency-form-row-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="dm-latency-name-field">
              <label className="dm-latency-name-label text-[11px] font-semibold text-app-muted block mb-1">
                Rule Name
              </label>
              <input
                type="text"
                value={newRuleName}
                onChange={(e) => setNewRuleName(e.target.value)}
                placeholder="e.g. Slow Profile Service"
                className="dm-latency-name-input w-full px-3 py-1.5 text-xs bg-app-bg border border-app-border rounded text-app-text focus:outline-none focus:border-app-border-focus"
              />
            </div>

            <div className="dm-latency-pattern-field">
              <label className="dm-latency-pattern-label text-[11px] font-semibold text-app-muted block mb-1">
                URL Pattern / Substring / Glob
              </label>
              <input
                type="text"
                required
                value={newPattern}
                onChange={(e) => {
                  setNewPattern(e.target.value);
                  if (patternError) setPatternError('');
                }}
                placeholder="e.g. */users* or /api/v1/data"
                className={`dm-latency-pattern-input w-full px-3 py-1.5 text-xs bg-app-bg border rounded text-app-text font-mono focus:outline-none ${
                  patternError
                    ? 'border-app-danger focus:border-app-danger'
                    : 'border-app-border focus:border-app-border-focus'
                }`}
              />
              {patternError && (
                <p className="dm-latency-pattern-error text-[11px] text-app-danger font-medium mt-1">
                  ⚠️ {patternError}
                </p>
              )}
            </div>
          </div>

          <div className="dm-latency-form-row-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="dm-latency-delay-field">
              <div className="dm-latency-delay-header flex items-center justify-between mb-1">
                <label className="dm-latency-delay-label text-[11px] font-semibold text-app-muted">
                  Synthetic Latency: {newDelay} ms
                </label>
                <div className="dm-latency-delay-presets flex gap-1">
                  {[500, 1500, 3000, 5000].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setNewDelay(d)}
                      className="dm-latency-delay-preset-btn px-1.5 py-0.5 text-[10px] rounded bg-app-bg hover:bg-app-elevated text-app-text font-mono border border-app-border"
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
                className="dm-latency-delay-slider w-full accent-app-primary"
              />
            </div>

            <div className="dm-latency-mock-status-field">
              <label className="dm-latency-mock-status-label text-[11px] font-semibold text-app-muted block mb-1">
                Synthetic Mock Status (Optional)
              </label>
              <select
                value={newMockStatus}
                onChange={(e) => setNewMockStatus(Number(e.target.value))}
                className="dm-latency-mock-status-select w-full px-3 py-1.5 text-xs bg-app-bg border border-app-border rounded text-app-text focus:outline-none focus:border-app-border-focus"
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
            className="dm-latency-save-btn w-full py-2 bg-app-primary hover:bg-app-primary-hover font-semibold text-xs text-white rounded transition-colors"
          >
            Save &amp; Activate Latency Rule
          </button>
        </form>
      )}

      {/* Rules List */}
      <div className="dm-latency-rules-list space-y-2">
        <div className="dm-latency-rules-list-header flex items-center justify-between">
          <span className="dm-latency-rules-list-title text-xs font-bold text-app-text">Configured Route Rules</span>
          <span className="dm-latency-rules-count text-[11px] text-app-muted font-mono">{rules.length} total</span>
        </div>

        {rules.length === 0 ? (
          <div className="dm-latency-empty-state p-8 text-center bg-app-surface rounded-lg border border-app-border text-app-muted text-xs">
            <Sliders className="dm-latency-empty-icon w-8 h-8 mx-auto mb-2 opacity-40 text-app-faint" />
            <p className="dm-latency-empty-primary font-semibold text-app-text">No route latency rules configured.</p>
            <p className="dm-latency-empty-hint text-[11px] mt-1 text-app-muted">
              Click &quot;+ New Rule&quot; or choose a quick preset above.
            </p>
          </div>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              className={`dm-latency-rule-row p-3.5 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                rule.enabled
                  ? 'bg-app-surface border-app-border'
                  : 'bg-app-bg border-app-border/60 opacity-60'
              }`}
            >
              <div className="dm-latency-rule-info flex items-center gap-3 min-w-0">
                <button
                  onClick={() => handleToggleRule(rule.id)}
                  className={`dm-latency-toggle-btn p-2 rounded transition-colors border ${
                    rule.enabled
                      ? 'bg-app-success-muted text-app-success border-app-success/40'
                      : 'bg-app-bg text-app-muted border-app-border'
                  }`}
                  title={rule.enabled ? 'Click to disable' : 'Click to enable'}
                >
                  <Power className="dm-latency-toggle-icon w-4 h-4" />
                </button>

                <div className="dm-latency-rule-details min-w-0">
                  <div className="dm-latency-rule-badges flex items-center gap-2">
                    <span className="dm-latency-rule-name text-xs font-bold text-app-text truncate">
                      {rule.name}
                    </span>
                    <span className="dm-latency-delay-badge px-2 py-0.2 rounded text-[10px] font-mono font-bold bg-app-warning-muted text-app-warning border border-app-warning/40">
                      +{rule.delayMs}ms
                    </span>
                    {rule.mockStatus && (
                      <span className="dm-latency-mock-badge px-2 py-0.2 rounded text-[10px] font-mono font-bold bg-app-danger-muted text-app-danger border border-app-danger/40">
                        {rule.mockStatus} MOCK
                      </span>
                    )}
                  </div>
                  <span className="dm-latency-rule-pattern font-mono text-[11px] text-app-muted truncate block mt-0.5">
                    {rule.urlPattern}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleDeleteRule(rule.id)}
                className="dm-latency-delete-btn p-1.5 rounded text-app-muted hover:text-app-danger hover:bg-app-elevated transition-colors shrink-0"
                title="Delete rule"
              >
                <Trash2 className="dm-latency-delete-icon w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
