import { DOMSnapshot } from './types';

class DOMChaosEngine {
  private snapshot: DOMSnapshot = {
    originalTextMap: new Map(),
    originalImgMap: new Map(),
    emptiedContainers: new Map(),
  };

  private overflowObserver: MutationObserver | null = null;
  private isHighlightingOverflow: boolean = false;
  private isScanning: boolean = false;
  private scanDebounceTimer: number | null = null;
  private badgeContainer: HTMLElement | null = null;
  private highlightedElements: Set<HTMLElement> = new Set();

  private pickerActive: boolean = false;
  private pickerHoverOverlay: HTMLElement | null = null;
  private onElementPickedCallback: ((el: HTMLElement) => void) | null = null;

  /**
   * Helper that traverses and modifies all text nodes inside an element and its subtree.
   */
  private stressElementSubtree(root: HTMLElement, stressText: string): number {
    if (root.closest('#dev-chaos-apitrace-root')) return 0;
    let modifiedCount = 0;

    // 1. Direct inputs / textareas / button values
    if (root instanceof HTMLInputElement || root instanceof HTMLTextAreaElement) {
      if (root.placeholder) {
        if (!this.snapshot.originalTextMap.has(root as any)) {
          this.snapshot.originalTextMap.set(root as any, root.placeholder);
        }
        root.placeholder = stressText;
        modifiedCount++;
      }
      if (root instanceof HTMLInputElement && ['button', 'submit', 'reset'].includes(root.type)) {
        if (!this.snapshot.originalTextMap.has(root as any)) {
          this.snapshot.originalTextMap.set(root as any, root.value);
        }
        root.value = stressText;
        modifiedCount++;
      }
    }

    // 2. Find and stress all text nodes within the element's subtree
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
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

    // 3. Also check descendant inputs / textareas (if root is a container)
    const inputs = root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
    for (const input of Array.from(inputs)) {
      if (input.closest('#dev-chaos-apitrace-root')) continue;
      if (input.placeholder) {
        if (!this.snapshot.originalTextMap.has(input as any)) {
          this.snapshot.originalTextMap.set(input as any, input.placeholder);
        }
        input.placeholder = stressText;
        modifiedCount++;
      }
    }

    return modifiedCount;
  }

  /**
   * Stresses text content within specified selector or on a specifically picked root element.
   */
  public injectTextStress(
    stressText: string,
    targetSelector?: string,
    specificRoot?: HTMLElement
  ): number {
    if (specificRoot) {
      // User picked a specific element (heading, paragraph, card, button, etc.)
      return this.stressElementSubtree(specificRoot, stressText);
    }

    // Global selector mode across the document
    const root = document.body;
    let modifiedCount = 0;
    const selector = targetSelector || 'p, span, h1, h2, h3, h4, h5, h6, button, a, td, th, li, label';
    const elements = Array.from(root.querySelectorAll<HTMLElement>(selector));

    for (const el of elements) {
      modifiedCount += this.stressElementSubtree(el, stressText);
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

    // Restore text nodes and input placeholders
    for (const [node, originalVal] of this.snapshot.originalTextMap.entries()) {
      try {
        if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
          if (node.placeholder !== undefined) node.placeholder = originalVal;
          if (node instanceof HTMLInputElement && ['button', 'submit', 'reset'].includes(node.type)) {
            node.value = originalVal;
          }
        } else {
          node.textContent = originalVal;
        }
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
   * Uses DOM MutationObserver and element dimension checks with debounce and self-mutation guards.
   */
  public toggleOverflowHighlight(enabled: boolean): void {
    this.isHighlightingOverflow = enabled;

    if (!enabled) {
      if (this.scanDebounceTimer) {
        cancelAnimationFrame(this.scanDebounceTimer);
        this.scanDebounceTimer = null;
      }
      if (this.overflowObserver) {
        this.overflowObserver.disconnect();
        this.overflowObserver = null;
      }
      this.clearOverflowHighlights();
      return;
    }

    // Run initial scan
    this.scanAndHighlightOverflow();

    // Observe dynamic changes with debounce & self-mutation filtering
    this.overflowObserver = new MutationObserver((mutations) => {
      if (!this.isHighlightingOverflow || this.isScanning) return;

      // Filter out mutations caused by our own extension UI and badge layer
      const isSelfMutation = mutations.every((m) => {
        const target = m.target as HTMLElement;
        return (
          target?.closest?.('#dev-chaos-apitrace-root') ||
          target?.closest?.('#dev-chaos-overflow-layer') ||
          (m.target as HTMLElement)?.id === 'dev-chaos-overflow-layer' ||
          (m.target as HTMLElement)?.hasAttribute?.('data-chaos-overflow')
        );
      });
      if (isSelfMutation) return;

      // Debounce using requestAnimationFrame (at most 1 scan per frame)
      if (this.scanDebounceTimer) {
        cancelAnimationFrame(this.scanDebounceTimer);
      }
      this.scanDebounceTimer = requestAnimationFrame(() => {
        if (this.isHighlightingOverflow && !this.isScanning) {
          this.scanAndHighlightOverflow();
        }
      });
    });

    this.overflowObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  private getOrCreateBadgeLayer(): HTMLElement {
    if (!this.badgeContainer || !this.badgeContainer.isConnected) {
      this.badgeContainer = document.createElement('div');
      this.badgeContainer.id = 'dev-chaos-overflow-layer';
      this.badgeContainer.style.position = 'absolute';
      this.badgeContainer.style.top = '0';
      this.badgeContainer.style.left = '0';
      this.badgeContainer.style.width = '100%';
      this.badgeContainer.style.pointerEvents = 'none';
      this.badgeContainer.style.zIndex = '999998';
      document.body.appendChild(this.badgeContainer);
    }
    return this.badgeContainer;
  }

  private scanAndHighlightOverflow(): void {
    if (this.isScanning) return;
    this.isScanning = true;

    try {
      this.clearOverflowHighlights();

      // Only scan visible structural content and text containers to avoid layout thrashing
      const candidates = document.querySelectorAll<HTMLElement>(
        'div, p, span, h1, h2, h3, h4, h5, h6, ul, ol, li, section, article, a, button, table, td, th'
      );

      const layer = this.getOrCreateBadgeLayer();
      let badgeCount = 0;
      const MAX_BADGES = 40; // Cap to top 40 overflows to maintain 60 FPS

      for (const el of Array.from(candidates)) {
        if (badgeCount >= MAX_BADGES) break;
        if (el === document.body || el === document.documentElement) continue;
        if (el.closest('#dev-chaos-apitrace-root') || el.closest('#dev-chaos-overflow-layer')) continue;

        // Skip non-rendered / hidden elements (avoids forced layout reflows)
        if (!el.offsetParent && el.offsetWidth === 0 && el.offsetHeight === 0) continue;

        const clientW = el.clientWidth;
        const scrollW = el.scrollWidth;
        const deltaX = scrollW - clientW;

        const clientH = el.clientHeight;
        const scrollH = el.scrollHeight;
        const deltaY = scrollH - clientH;

        // Fast check before getComputedStyle
        if (deltaX <= 3 && deltaY <= 3) continue;

        const style = window.getComputedStyle(el);
        if (style.overflowX === 'scroll' || style.overflowX === 'auto') continue;

        // Detect horizontal overflow, or vertical overflow with overflow: hidden
        if (deltaX > 3 || (deltaY > 3 && style.overflowY === 'hidden')) {
          el.setAttribute('data-chaos-overflow', 'true');
          el.style.outline = '2px dashed #e11d48';
          el.style.outlineOffset = '2px';
          this.highlightedElements.add(el);

          // Create badge
          const badge = document.createElement('div');
          badge.className = 'chaos-overflow-badge';
          badge.textContent = `⚠️ Overflow +${Math.max(deltaX, deltaY)}px`;
          badge.style.position = 'absolute';
          badge.style.backgroundColor = '#e11d48';
          badge.style.color = '#ffffff';
          badge.style.fontSize = '10px';
          badge.style.fontFamily = 'monospace';
          badge.style.fontWeight = 'bold';
          badge.style.padding = '1px 5px';
          badge.style.borderRadius = '3px';
          badge.style.pointerEvents = 'none';

          const rect = el.getBoundingClientRect();
          badge.style.top = `${window.scrollY + rect.top - 16}px`;
          badge.style.left = `${window.scrollX + Math.max(0, rect.left)}px`;

          layer.appendChild(badge);
          badgeCount++;
        }
      }
    } finally {
      this.isScanning = false;
    }
  }

  public clearOverflowHighlights(): void {
    for (const el of this.highlightedElements) {
      try {
        el.style.outline = '';
        el.style.outlineOffset = '';
        el.removeAttribute('data-chaos-overflow');
      } catch {
        // Element might have been detached
      }
    }
    this.highlightedElements.clear();

    if (this.badgeContainer) {
      while (this.badgeContainer.firstChild) {
        this.badgeContainer.removeChild(this.badgeContainer.firstChild);
      }
    }
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
      this.pickerHoverOverlay.style.border = '2px solid #d97706';
      this.pickerHoverOverlay.style.backgroundColor = 'rgba(217, 119, 6, 0.15)';
      this.pickerHoverOverlay.style.zIndex = '9999999';
      this.pickerHoverOverlay.style.transition = 'all 0.05s ease';
      this.pickerHoverOverlay.style.display = 'none';
      document.body.appendChild(this.pickerHoverOverlay);
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!this.pickerActive) return;
      const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
      if (!target || target.closest('#dev-chaos-apitrace-root') || target.closest('#dev-chaos-overflow-layer')) {
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

      if (target && !target.closest('#dev-chaos-apitrace-root') && !target.closest('#dev-chaos-overflow-layer') && this.onElementPickedCallback) {
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
