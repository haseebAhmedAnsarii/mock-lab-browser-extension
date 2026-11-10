import React, { useState } from 'react';
import {
  Flame,
  RotateCcw,
  MousePointer,
  Sparkles,
  AlertTriangle,
  EyeOff,
  ImageOff,
  CheckCircle2,
  ListFilter,
  Type,
  Maximize2,
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
  const [overflowScanning, setOverflowScanning] = useState(false);
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

  const handleStartPicker = () => {
    setIsPickingElement(true);
    domChaos.startElementPicker((el) => {
      setIsPickingElement(false);
      setPickedElement(el);
      const tag = el.tagName.toLowerCase();
      const idOrClass = el.id ? `#${el.id}` : el.className ? `.${el.className.split(' ')[0]}` : '';
      onNotify?.(`Target locked: <${tag}${idOrClass}>. Pick a stress preset below.`);
    });
  };

  const handleCancelPicker = () => {
    domChaos.stopElementPicker();
    setIsPickingElement(false);
    setPickedElement(null);
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

  const handleToggleOverflowScan = () => {
    const next = !overflowScanning;
    setOverflowScanning(next);
    domChaos.toggleOverflowHighlight(next);
    onNotify?.(
      next
        ? 'Active MutationObserver scanning for container text clipping / overflow.'
        : 'Stopped overflow scanner.'
    );
  };

  const filteredPresets = CHAOS_PRESETS.filter(
    (p) => selectedCategory === 'all' || p.category === selectedCategory
  );

  const totalModifications = stats.textNodes + stats.images + stats.lists;

  return (
    <div className="flex flex-col h-full overflow-y-auto space-y-5 p-4 text-slate-200">
      {/* Top Banner / Revert Status */}
      <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-slate-900 to-indigo-950/60 border border-indigo-900/40 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-500 animate-pulse" />
            <h3 className="text-sm font-semibold text-white">Dev Mock & Chaos Palette</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Inject stress payloads, simulate empty fallbacks & verify layout truncation without editing DBs.
          </p>
        </div>

        <button
          onClick={handleRevertAll}
          disabled={totalModifications === 0}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            totalModifications > 0
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-900/30'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
          title="Reverts all DOM modifications back to their pristine state"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restore Page ({totalModifications})</span>
        </button>
      </div>

      {/* Quick Chaos Simulation Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={handleSimulateEmptyLists}
          className="flex flex-col p-3 bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-indigo-600/50 rounded-xl text-left transition-all group"
        >
          <div className="flex items-center justify-between w-full mb-1">
            <span className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg group-hover:scale-105 transition-transform">
              <EyeOff className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              {stats.lists > 0 ? `${stats.lists} emptied` : 'Ready'}
            </span>
          </div>
          <span className="text-xs font-semibold text-slate-200">Empty List Simulator</span>
          <span className="text-[11px] text-slate-400 mt-0.5">
            Wipes lists & tables to test empty state illustrations
          </span>
        </button>

        <button
          onClick={handleSimulateBrokenImages}
          className="flex flex-col p-3 bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-indigo-600/50 rounded-xl text-left transition-all group"
        >
          <div className="flex items-center justify-between w-full mb-1">
            <span className="p-1.5 bg-rose-500/10 text-rose-400 rounded-lg group-hover:scale-105 transition-transform">
              <ImageOff className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              {stats.images > 0 ? `${stats.images} broken` : 'Ready'}
            </span>
          </div>
          <span className="text-xs font-semibold text-slate-200">Broken Image Tester</span>
          <span className="text-[11px] text-slate-400 mt-0.5">
            Triggers onerror to test fallback avatars & icons
          </span>
        </button>

        <button
          onClick={handleToggleOverflowScan}
          className={`flex flex-col p-3 rounded-xl text-left border transition-all group ${
            overflowScanning
              ? 'bg-rose-950/40 border-rose-600/80 text-rose-200'
              : 'bg-slate-900/90 hover:bg-slate-850 border-slate-800 hover:border-indigo-600/50 text-slate-200'
          }`}
        >
          <div className="flex items-center justify-between w-full mb-1">
            <span
              className={`p-1.5 rounded-lg transition-transform ${
                overflowScanning ? 'bg-rose-500 text-white' : 'bg-indigo-500/10 text-indigo-400'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-mono font-medium">
              {overflowScanning ? 'SCANNING' : 'OFF'}
            </span>
          </div>
          <span className="text-xs font-semibold">Overflow Scanner</span>
          <span className="text-[11px] text-slate-400 mt-0.5">
            MutationObserver badge highlights container clipping
          </span>
        </button>
      </div>

      {/* Target Selector & Interactive Element Picker */}
      <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Type className="w-4 h-4 text-indigo-400" />
            <h4 className="text-xs font-semibold text-slate-200">Target Injection Scope</h4>
          </div>

          {pickedElement ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Target: &lt;{pickedElement.tagName.toLowerCase()}&gt;
              </span>
              <button
                onClick={handleCancelPicker}
                className="text-[11px] text-rose-400 hover:text-rose-300 underline"
              >
                Clear
              </button>
            </div>
          ) : (
            <button
              onClick={handleStartPicker}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                isPickingElement
                  ? 'bg-indigo-600 text-white animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              <MousePointer className="w-3.5 h-3.5" />
              <span>{isPickingElement ? 'Click Any Element on Page...' : 'Pick Specific Element'}</span>
            </button>
          )}
        </div>

        {/* Scope selector buttons */}
        {!pickedElement && (
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'headings', label: 'All Headings (h1-h6)' },
              { id: 'paragraphs', label: 'Paragraphs & Spans' },
              { id: 'buttons', label: 'Buttons & Links' },
              { id: 'inputs', label: 'Inputs & Placeholders' },
              { id: 'all', label: 'Entire Page Text' },
            ].map((scope) => (
              <button
                key={scope.id}
                onClick={() => setTargetScope(scope.id as any)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  targetScope === scope.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-750'
                }`}
              >
                {scope.label}
              </button>
            ))}
          </div>
        )}

        {/* Custom Text Input */}
        <div className="flex gap-2 pt-2 border-t border-slate-800/80">
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Type custom text to stress-test layout..."
            className="flex-1 px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            onKeyDown={(e) => e.key === 'Enter' && handleApplyCustomText()}
          />
          <button
            onClick={handleApplyCustomText}
            disabled={!customText.trim()}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-colors"
          >
            Inject Custom
          </button>
        </div>
      </div>

      {/* Stress Presets Library */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-semibold text-slate-200">Stress Presets Library</h4>
          </div>

          <span className="text-[11px] text-slate-500 font-mono">
            {filteredPresets.length} presets
          </span>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1 rounded-full whitespace-nowrap text-xs font-medium transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Presets Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {filteredPresets.map((preset) => (
            <div
              key={preset.id}
              onClick={() => handleApplyPreset(preset)}
              className="p-3 bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/50 rounded-xl cursor-pointer transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors">
                    {preset.name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 uppercase bg-slate-950 px-1.5 py-0.5 rounded">
                    {preset.value.length} chars
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2">
                  {preset.description}
                </p>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between">
                <span className="font-mono text-[10px] text-slate-500 truncate max-w-[200px]">
                  {preset.value.slice(0, 35)}...
                </span>
                <span className="text-[11px] font-medium text-indigo-400 group-hover:text-indigo-300 flex items-center gap-0.5">
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

