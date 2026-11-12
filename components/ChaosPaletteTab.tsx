import React, { useState } from 'react';
import {
  Flame,
  RotateCcw,
  MousePointer,
  Sparkles,
  EyeOff,
  ImageOff,
  Type,
  X,
} from 'lucide-react';
import { CHAOS_PRESETS } from '../utils/chaos-presets';
import { TextStressPreset, TextStressPresetCategory } from '../utils/types';
import { domChaos } from '../utils/dom-chaos';

interface ChaosPaletteTabProps {
  onNotify?: (message: string) => void;
}

export const ChaosPaletteTab: React.FC<ChaosPaletteTabProps> = ({ onNotify }) => {
  const [selectedCategory, setSelectedCategory] = useState<TextStressPresetCategory | 'all'>('all');
  const [targetScope, setTargetScope] = useState<'headings' | 'paragraphs' | 'buttons' | 'inputs' | 'all'>('headings');
  const [customText, setCustomText] = useState('');
  const [isPickingElement, setIsPickingElement] = useState(false);
  const [pickedElement, setPickedElement] = useState<HTMLElement | null>(null);
  const [stats, setStats] = useState(domChaos.getModifiedCounts());

  const categories: { id: TextStressPresetCategory | 'all'; label: string }[] = [
    { id: 'all', label: 'All Presets' },
    { id: 'extreme_length', label: 'Extreme Length' },
    { id: 'overflow_words', label: 'Unbroken Tokens' },
    { id: 'rtl_languages', label: 'RTL & Foreign' },
    { id: 'special_unicode', label: 'Emojis & Unicode' },
    { id: 'zalgo_diacritics', label: 'Zalgo Height' },
    { id: 'html_xss_vectors', label: 'HTML Escaping' },
    { id: 'zero_width', label: 'Zero-Width' },
  ];

  const getSelectorForScope = (): string => {
    switch (targetScope) {
      case 'headings':
        return 'h1, h2, h3, h4, h5, h6';
      case 'paragraphs':
        return 'p, span, td, th, li';
      case 'buttons':
        return 'button, a, [role="button"], input[type="button"], input[type="submit"]';
      case 'inputs':
        return 'input, textarea, label';
      default:
        return 'h1, h2, h3, h4, h5, h6, p, span, button, a, td, th, li';
    }
  };

  const handleApplyPreset = (preset: TextStressPreset) => {
    let count = 0;
    if (pickedElement) {
      count = domChaos.injectTextStress(preset.value, undefined, pickedElement);
      onNotify?.(`Injected "${preset.name}" into picked element (${count} nodes)`);
    } else {
      const selector = getSelectorForScope();
      count = domChaos.injectTextStress(preset.value, selector);
      onNotify?.(`Injected "${preset.name}" across ${targetScope} (${count} text nodes)`);
    }
    setStats(domChaos.getModifiedCounts());
  };

  const handleApplyCustomText = () => {
    if (!customText.trim()) return;
    let count = 0;
    if (pickedElement) {
      count = domChaos.injectTextStress(customText, undefined, pickedElement);
    } else {
      count = domChaos.injectTextStress(customText, getSelectorForScope());
    }
    setStats(domChaos.getModifiedCounts());
    onNotify?.(`Injected custom stress text into ${count} nodes`);
  };

  const handleTogglePicker = () => {
    if (isPickingElement) {
      domChaos.stopElementPicker();
      setIsPickingElement(false);
      onNotify?.('Cancelled element picking.');
    } else {
      setIsPickingElement(true);
      domChaos.startElementPicker(
        (el) => {
          setIsPickingElement(false);
          setPickedElement(el);
          const tag = el.tagName.toLowerCase();
          const idOrClass = el.id ? `#${el.id}` : el.className ? `.${el.className.split(' ')[0]}` : '';
          onNotify?.(`Target locked: <${tag}${idOrClass}>. Pick a stress preset below.`);
        },
        () => {
          setIsPickingElement(false);
        }
      );
    }
  };

  const handleClearPickedElement = () => {
    domChaos.stopElementPicker();
    setIsPickingElement(false);
    setPickedElement(null);
    onNotify?.('Cleared specific element. Resumed scope mode.');
  };

  const handleSimulateEmptyLists = () => {
    const count = domChaos.simulateEmptyLists();
    setStats(domChaos.getModifiedCounts());
    onNotify?.(`Emptied ${count} list / collection containers to test empty states.`);
  };

  const handleSimulateBrokenImages = () => {
    const count = domChaos.simulateBrokenImages();
    setStats(domChaos.getModifiedCounts());
    onNotify?.(`Simulated broken images on ${count} image / avatar elements.`);
  };

  const handleRevertAll = () => {
    const { restoredTexts, restoredImages, restoredLists } = domChaos.revertAll();
    setStats(domChaos.getModifiedCounts());
    setPickedElement(null);
    onNotify?.(
      `Restored page: ${restoredTexts} texts, ${restoredImages} images, and ${restoredLists} lists.`
    );
  };

  const filteredPresets = CHAOS_PRESETS.filter(
    (p) => selectedCategory === 'all' || p.category === selectedCategory
  );

  const totalModifications = stats.textNodes + stats.images + stats.lists;

  return (
    <div className="dm-chaos-root flex flex-col h-full overflow-y-auto space-y-4 p-4 text-app-text">
      {/* Top Banner (Solid Flat Background, No Gradients) */}
      <div className="dm-chaos-banner flex items-center justify-between p-3.5 bg-app-surface border border-app-border rounded-lg">
        <div className="dm-chaos-banner-info">
          <div className="dm-chaos-banner-title-row flex items-center gap-2">
            <Flame className="dm-chaos-banner-icon w-4 h-4 text-app-danger" />
            <h3 className="dm-chaos-banner-heading text-xs font-bold uppercase tracking-tight text-app-text">
              Dev Mock &amp; Chaos Palette
            </h3>
          </div>
          <p className="dm-chaos-banner-description text-xs text-app-muted mt-0.5">
            Inject stress payloads, simulate empty fallbacks &amp; verify layout truncation.
          </p>
        </div>

        <button
          onClick={handleRevertAll}
          disabled={totalModifications === 0}
          className={`dm-chaos-restore-btn flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all border ${
            totalModifications > 0
              ? 'bg-app-danger text-white border-app-danger hover:opacity-90'
              : 'bg-app-elevated text-app-faint border-app-border cursor-not-allowed'
          }`}
          title="Reverts all DOM modifications back to their pristine state"
        >
          <RotateCcw className="dm-chaos-restore-icon w-3.5 h-3.5" />
          <span className="dm-chaos-restore-label">Restore Page ({totalModifications})</span>
        </button>
      </div>

      {/* Quick Chaos Simulation Actions (Solid Cards) */}
      <div className="dm-chaos-actions-grid grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <button
          onClick={handleSimulateEmptyLists}
          className="dm-chaos-empty-list-card flex flex-col p-3 bg-app-surface hover:bg-app-elevated border border-app-border hover:border-app-border-focus rounded-lg text-left transition-all"
        >
          <div className="dm-chaos-empty-list-header flex items-center justify-between w-full mb-1">
            <span className="dm-chaos-empty-list-icon-wrap p-1.5 bg-app-warning-muted text-app-warning rounded">
              <EyeOff className="dm-chaos-empty-list-icon w-4 h-4" />
            </span>
            <span className="dm-chaos-empty-list-stat text-[11px] font-mono text-app-muted">
              {stats.lists > 0 ? `${stats.lists} emptied` : 'Ready'}
            </span>
          </div>
          <span className="dm-chaos-empty-list-title text-xs font-bold text-app-text">Empty List Simulator</span>
          <span className="dm-chaos-empty-list-desc text-[11px] text-app-muted mt-0.5">
            Wipes lists, tables &amp; grids to test empty state illustrations
          </span>
        </button>

        <button
          onClick={handleSimulateBrokenImages}
          className="dm-chaos-broken-img-card flex flex-col p-3 bg-app-surface hover:bg-app-elevated border border-app-border hover:border-app-border-focus rounded-lg text-left transition-all"
        >
          <div className="dm-chaos-broken-img-header flex items-center justify-between w-full mb-1">
            <span className="dm-chaos-broken-img-icon-wrap p-1.5 bg-app-danger-muted text-app-danger rounded">
              <ImageOff className="dm-chaos-broken-img-icon w-4 h-4" />
            </span>
            <span className="dm-chaos-broken-img-stat text-[11px] font-mono text-app-muted">
              {stats.images > 0 ? `${stats.images} broken` : 'Ready'}
            </span>
          </div>
          <span className="dm-chaos-broken-img-title text-xs font-bold text-app-text">Broken Image Tester</span>
          <span className="dm-chaos-broken-img-desc text-[11px] text-app-muted mt-0.5">
            Triggers onerror to test fallback avatars &amp; image placeholders
          </span>
        </button>
      </div>

      {/* Target Selector & Interactive Element Picker */}
      <div className="dm-chaos-scope-section p-3.5 bg-app-surface rounded-lg border border-app-border space-y-3">
        <div className="dm-chaos-scope-header flex items-center justify-between gap-2 flex-wrap">
          <div className="dm-chaos-scope-title-row flex items-center gap-1.5">
            <Type className="dm-chaos-scope-icon w-4 h-4 text-app-primary" />
            <h4 className="dm-chaos-scope-heading text-xs font-bold text-app-text">Target Injection Scope</h4>
          </div>

          <div className="dm-chaos-picker-controls flex items-center gap-2">
            {pickedElement && (
              <div className="dm-chaos-picked-badge flex items-center gap-1.5 px-2 py-0.5 rounded bg-app-elevated border border-app-border text-[11px] font-mono">
                <span className="dm-chaos-picked-tag text-app-text font-semibold">
                  &lt;{pickedElement.tagName.toLowerCase()}{pickedElement.id ? `#${pickedElement.id}` : ''}&gt;
                </span>
                <button
                  onClick={handleClearPickedElement}
                  className="dm-chaos-clear-pick-btn text-app-muted hover:text-app-danger transition-colors ml-0.5"
                  title="Clear picked element"
                >
                  <X className="dm-chaos-clear-pick-icon w-3 h-3" />
                </button>
              </div>
            )}

            <button
              onClick={handleTogglePicker}
              className={`dm-chaos-picker-btn flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-all border ${
                isPickingElement
                  ? 'bg-app-primary text-white border-app-primary ring-1 ring-app-primary/50'
                  : 'bg-app-elevated hover:bg-app-surface text-app-text border-app-border'
              }`}
              title={isPickingElement ? 'Click to cancel element picker' : 'Click to pick an element on the page'}
            >
              <MousePointer className={`dm-chaos-picker-icon w-3.5 h-3.5 ${isPickingElement ? 'animate-pulse' : ''}`} />
              <span className="dm-chaos-picker-label">
                {isPickingElement
                  ? 'Cancel Picking'
                  : pickedElement
                  ? 'Change Target'
                  : 'Pick Specific Element'}
              </span>
            </button>
          </div>
        </div>

        {/* Scope selector buttons */}
        {!pickedElement && (
          <div className="dm-chaos-scope-pills flex flex-wrap gap-1.5">
            {[
              { id: 'headings', label: 'Headings (h1-h6)' },
              { id: 'paragraphs', label: 'Paragraphs & Spans' },
              { id: 'buttons', label: 'Buttons & Links' },
              { id: 'inputs', label: 'Inputs & Placeholders' },
              { id: 'all', label: 'Entire Page Text' },
            ].map((scope) => (
              <button
                key={scope.id}
                onClick={() => setTargetScope(scope.id as any)}
                className={`dm-chaos-scope-pill px-2.5 py-1 rounded text-xs font-medium transition-colors border ${
                  targetScope === scope.id
                    ? 'bg-app-text text-app-bg border-app-text font-bold'
                    : 'bg-app-bg text-app-muted border-app-border hover:text-app-text'
                }`}
              >
                {scope.label}
              </button>
            ))}
          </div>
        )}

        {/* Custom Text Input */}
        <div className="dm-chaos-custom-input-row flex gap-2 pt-2 border-t border-app-border">
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Type custom text to stress-test layout..."
            className="dm-chaos-custom-input flex-1 px-3 py-1.5 text-xs bg-app-bg border border-app-border rounded text-app-text placeholder-app-faint focus:outline-none focus:border-app-border-focus font-mono"
            onKeyDown={(e) => e.key === 'Enter' && handleApplyCustomText()}
          />
          <button
            onClick={handleApplyCustomText}
            disabled={!customText.trim()}
            className="dm-chaos-custom-inject-btn px-3 py-1.5 rounded text-xs font-semibold bg-app-primary hover:bg-app-primary-hover disabled:opacity-40 text-white transition-colors"
          >
            Inject Custom
          </button>
        </div>
      </div>

      {/* Stress Presets Library */}
      <div className="dm-chaos-presets-section space-y-2.5">
        <div className="dm-chaos-presets-header flex items-center justify-between">
          <div className="dm-chaos-presets-title-row flex items-center gap-1.5">
            <Sparkles className="dm-chaos-presets-icon w-4 h-4 text-app-warning" />
            <h4 className="dm-chaos-presets-heading text-xs font-bold text-app-text">Stress Presets Library</h4>
          </div>

          <span className="dm-chaos-presets-count text-[11px] text-app-muted font-mono">
            {filteredPresets.length} presets
          </span>
        </div>

        {/* Category Pills */}
        <div className="dm-chaos-category-pills flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`dm-chaos-category-pill px-2.5 py-1 rounded whitespace-nowrap text-xs font-medium transition-colors border ${
                selectedCategory === cat.id
                  ? 'bg-app-primary text-white border-app-primary font-bold'
                  : 'bg-app-surface text-app-muted border-app-border hover:text-app-text'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Presets Grid (Solid Flat Cards) */}
        <div className="dm-chaos-preset-grid grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {filteredPresets.map((preset) => (
            <div
              key={preset.id}
              onClick={() => handleApplyPreset(preset)}
              className="dm-chaos-preset-card p-3 bg-app-surface hover:bg-app-elevated border border-app-border hover:border-app-border-focus rounded-lg cursor-pointer transition-all flex flex-col justify-between"
            >
              <div className="dm-chaos-preset-card-body">
                <div className="dm-chaos-preset-card-header flex items-center justify-between mb-1">
                  <span className="dm-chaos-preset-name text-xs font-bold text-app-text">
                    {preset.name}
                  </span>
                  <span className="dm-chaos-preset-char-count text-[10px] font-mono text-app-muted uppercase bg-app-bg px-1.5 py-0.5 rounded border border-app-border">
                    {preset.value.length} chars
                  </span>
                </div>
                <p className="dm-chaos-preset-description text-[11px] text-app-muted line-clamp-2">
                  {preset.description}
                </p>
              </div>

              <div className="dm-chaos-preset-footer mt-2.5 pt-2 border-t border-app-border flex items-center justify-between">
                <span className="dm-chaos-preset-preview font-mono text-[10px] text-app-faint truncate max-w-[200px]">
                  {preset.value.slice(0, 35)}...
                </span>
                <span className="dm-chaos-preset-inject-label text-[11px] font-bold text-app-primary flex items-center gap-0.5">
                  Inject &rarr;
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
