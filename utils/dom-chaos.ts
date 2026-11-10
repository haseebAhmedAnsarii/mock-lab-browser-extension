import { DOMSnapshot } from './types';

class DOMChaosEngine {
  private snapshot: DOMSnapshot = {
    originalTextMap: new Map(),
    originalImgMap: new Map(),
    emptiedContainers: new Map(),
  };

  private overflowObserver: MutationObserver | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private isHighlightingOverflow: boolean = false;
  private overflowBadges: HTMLElement[] = [];
  private pickerActive: boolean = false;
  private pickerHoverOverlay: HTMLElement | null = null;
  private onElementPickedCallback: ((el: HTMLElement) => void) | null = null;

  /**
   * Stresses text content within specified selector or all matching elements.
   */
  public injectTextStress(
    stressText: string,
    targetSelector?: string,
    specificRoot?: HTMLElement
  ): number {
    const root = specificRoot || document.body;
    let modifiedCount = 0;

    let elements: HTMLElement[] = [];
    if (targetSelector) {
      elements = Array.from(root.querySelectorAll<HTMLElement>(targetSelector));
      if (root.matches && root.matches(targetSelector)) {
        elements.unshift(root);
      }
    } else {
      // Default to common text containers
      elements = Array.from(
        root.querySelectorAll<HTMLElement>('p, span, h1, h2, h3, h4, h5, h6, button, a, td, th, li, label')
      );
    }

    for (const el of elements) {
      // Skip the extension's own UI
      if (el.closest('#dev-chaos-apitrace-root')) continue;

      // Find direct text nodes inside element
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => {
          if (!node.textContent || node.textContent.trim().length === 0) {
            return NodeFilter.FILTER_REJECT;
          }
          if (node.parentElement?.closest('#dev-chaos-apitrace-root')) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      });

      let textNode = walker.nextNode();
      while (textNode) {
        if (!this.snapshot.originalTextMap.has(textNode)) {
          this.snapshot.originalTextMap.set(textNode, textNode.textContent || '');
        }
        textNode.textContent = stressText;
        modifiedCount++;
        textNode = walker.nextNode();
      }

      // If it's an input or textarea, update placeholder or value
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        if (el.placeholder) {
          el.placeholder = stressText;
          modifiedCount++;
        }
      }
    }

    return modifiedCount;
  }

  /**
   * One-click Empty-State Simulator:
   * Empties lists, tables, and collections while preserving original nodes for undo.
   */
  public simulateEmptyLists(): number {
    let emptiedCount = 0;
    const listContainers = document.querySelectorAll<HTMLElement>(
      'ul, ol, tbody, [role="list"], [role="grid"], [data-testid*="list"], [class*="list"], [class*="grid"]'
    );

    for (const container of Array.from(listContainers)) {
      if (container.closest('#dev-chaos-apitrace-root')) continue;
      if (this.snapshot.emptiedContainers.has(container)) continue;

      const children = Array.from(container.childNodes);
      if (children.length > 0) {
        this.snapshot.emptiedContainers.set(container, children);
        // Clear children
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
        emptiedCount++;
      }
    }

    return emptiedCount;
  }

  /**
   * One-click Image Fallback Simulator:
   * Sets image sources to broken/placeholder targets to test fallback images, avatars, and broken-image states.
   */
  public simulateBrokenImages(): number {
    let modifiedImages = 0;
    const images = document.querySelectorAll<HTMLImageElement>('img, [role="img"]');

    for (const img of Array.from(images)) {
      if (img.closest('#dev-chaos-apitrace-root')) continue;

      if (!this.snapshot.originalImgMap.has(img)) {
        this.snapshot.originalImgMap.set(img, {
          src: img.src,
          srcset: img.getAttribute('srcset') || undefined,
          alt: img.getAttribute('alt') || undefined,
        });
      }

      img.removeAttribute('srcset');
      // Set to invalid URL to trigger onerror handler / fallback avatar
      img.src = 'https://broken-image-fallback-test.invalid/404.png';
      img.dispatchEvent(new Event('error'));
      modifiedImages++;
    }

    return modifiedImages;
  }

  /**
   * Reverts all DOM modifications back to their pristine original snapshot.
   */
  public revertAll(): { restoredTexts: number; restoredImages: number; restoredLists: number } {
    let restoredTexts = 0;
    let restoredImages = 0;
    let restoredLists = 0;

    // Restore text nodes
    for (const [node, originalVal] of this.snapshot.originalTextMap.entries()) {
      try {
        node.textContent = originalVal;
        restoredTexts++;
      } catch {
        // Node might have been removed
      }
    }
    this.snapshot.originalTextMap.clear();

    // Restore image sources
    for (const [img, data] of this.snapshot.originalImgMap.entries()) {
      try {
        img.src = data.src;
        if (data.srcset) img.setAttribute('srcset', data.srcset);
        if (data.alt) img.setAttribute('alt', data.alt);
        restoredImages++;
      } catch {
        // Ignored
      }
    }
    this.snapshot.originalImgMap.clear();

    // Restore emptied lists
    for (const [container, children] of this.snapshot.emptiedContainers.entries()) {
      try {
        for (const child of children) {
          container.appendChild(child);
        }
        restoredLists++;
      } catch {
        // Ignored
      }
    }
    this.snapshot.emptiedContainers.clear();

    // Remove overflow highlights
    this.clearOverflowHighlights();

    return { restoredTexts, restoredImages, restoredLists };
  }

  /**
   * Overflow Scanner:
   * Uses DOM MutationObserver and element dimension checks to detect horizontal/vertical layout clipping.
   */
  public toggleOverflowHighlight(enabled: boolean): void {
    this.isHighlightingOverflow = enabled;

    if (!enabled) {
      this.clearOverflowHighlights();
      if (this.overflowObserver) {
        this.overflowObserver.disconnect();
        this.overflowObserver = null;
      }
      return;
    }

    this.scanAndHighlightOverflow();

    // Watch for dynamic DOM changes to re-evaluate overflow
    this.overflowObserver = new MutationObserver(() => {
      if (this.isHighlightingOverflow) {
        this.scanAndHighlightOverflow();
      }
    });

    this.overflowObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  private scanAndHighlightOverflow(): void {
    this.clearOverflowHighlights();

    const candidates = document.querySelectorAll<HTMLElement>(
      '*:not(#dev-chaos-apitrace-root):not(#dev-chaos-apitrace-root *)'
    );

    for (const el of Array.from(candidates)) {
      if (el === document.body || el === document.documentElement) continue;

      const style = window.getComputedStyle(el);
      // Skip intentionally scrollable elements
      if (style.overflowX === 'scroll' || style.overflowX === 'auto') continue;

      const deltaX = el.scrollWidth - el.clientWidth;
      const deltaY = el.scrollHeight - el.clientHeight;

      // Noticeable overflow (> 3px)
      if (deltaX > 3 || (deltaY > 3 && style.overflowY === 'hidden')) {
        el.setAttribute('data-chaos-overflow', 'true');
        el.style.outline = '2px dashed #f43f5e';
        el.style.outlineOffset = '2px';

        // Floating badge indicator
        const badge = document.createElement('div');
        badge.className = 'chaos-overflow-badge';
        badge.textContent = `⚠️ Overflow +${Math.max(deltaX, deltaY)}px`;
        badge.style.position = 'absolute';
        badge.style.backgroundColor = '#f43f5e';
        badge.style.color = '#ffffff';
        badge.style.fontSize = '10px';
        badge.style.fontFamily = 'monospace';
        badge.style.fontWeight = 'bold';
        badge.style.padding = '1px 5px';
        badge.style.borderRadius = '3px';
        badge.style.zIndex = '999998';
        badge.style.pointerEvents = 'none';

        const rect = el.getBoundingClientRect();
        badge.style.top = `${window.scrollY + rect.top - 16}px`;
        badge.style.left = `${window.scrollX + rect.left}px`;

        document.body.appendChild(badge);
        this.overflowBadges.push(badge);
      }
    }
  }

  public clearOverflowHighlights(): void {
    const highlighted = document.querySelectorAll('[data-chaos-overflow]');
    for (const el of Array.from(highlighted)) {
      (el as HTMLElement).style.outline = '';
      (el as HTMLElement).style.outlineOffset = '';
      el.removeAttribute('data-chaos-overflow');
    }

    for (const badge of this.overflowBadges) {
      badge.remove();
    }
    this.overflowBadges = [];
  }

  /**
   * Interactive Element Picker: Allows user to click any specific element to test.
   */
  public startElementPicker(onPicked: (el: HTMLElement) => void): void {
    this.pickerActive = true;
    this.onElementPickedCallback = onPicked;

    if (!this.pickerHoverOverlay) {
      this.pickerHoverOverlay = document.createElement('div');
      this.pickerHoverOverlay.style.position = 'fixed';
      this.pickerHoverOverlay.style.pointerEvents = 'none';
      this.pickerHoverOverlay.style.border = '2px solid #6366f1';
      this.pickerHoverOverlay.style.backgroundColor = 'rgba(99, 102, 241, 0.15)';
      this.pickerHoverOverlay.style.zIndex = '9999999';
      this.pickerHoverOverlay.style.transition = 'all 0.05s ease';
      this.pickerHoverOverlay.style.display = 'none';
      document.body.appendChild(this.pickerHoverOverlay);
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!this.pickerActive) return;
      const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
      if (!target || target.closest('#dev-chaos-apitrace-root')) {
        if (this.pickerHoverOverlay) this.pickerHoverOverlay.style.display = 'none';
        return;
      }

      const rect = target.getBoundingClientRect();
      if (this.pickerHoverOverlay) {
        this.pickerHoverOverlay.style.display = 'block';
        this.pickerHoverOverlay.style.top = `${rect.top}px`;
        this.pickerHoverOverlay.style.left = `${rect.left}px`;
        this.pickerHoverOverlay.style.width = `${rect.width}px`;
        this.pickerHoverOverlay.style.height = `${rect.height}px`;
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (!this.pickerActive) return;
      e.preventDefault();
      e.stopPropagation();

      const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
      this.stopElementPicker();

      if (target && !target.closest('#dev-chaos-apitrace-root') && this.onElementPickedCallback) {
        this.onElementPickedCallback(target);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.stopElementPicker();
      }
    };

    window.addEventListener('mousemove', handleMouseMove, true);
    window.addEventListener('click', handleClick, true);
    window.addEventListener('keydown', handleKeyDown, true);

    this.stopElementPicker = () => {
      this.pickerActive = false;
      if (this.pickerHoverOverlay) {
        this.pickerHoverOverlay.style.display = 'none';
      }
      window.removeEventListener('mousemove', handleMouseMove, true);
      window.removeEventListener('click', handleClick, true);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }

  public stopElementPicker: () => void = () => {};

  public getModifiedCounts() {
    return {
      textNodes: this.snapshot.originalTextMap.size,
      images: this.snapshot.originalImgMap.size,
      lists: this.snapshot.emptiedContainers.size,
    };
  }
}

export const domChaos = new DOMChaosEngine();

