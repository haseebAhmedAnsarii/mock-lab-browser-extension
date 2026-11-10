import { DOMSnapshot } from './types';

class DOMChaosEngine {
  private snapshot: DOMSnapshot = {
    originalTextMap: new Map(),
    originalImgMap: new Map(),
    emptiedContainers: new Map(),
  };

  private pickerActive: boolean = false;
  private pickerHoverOverlay: HTMLElement | null = null;
  private onElementPickedCallback: ((el: HTMLElement) => void) | null = null;
  private onElementPickerCancelCallback: (() => void) | null = null;

  /**
   * Helper that checks whether an element or node belongs to our extension UI
   * (including the Shadow DOM host, drawer, dock, or hover overlay).
   */
  public isExtensionElement(el: Node | null | undefined): boolean {
    if (!el) return false;
    if (el === this.pickerHoverOverlay) return true;
    if (el instanceof Element) {
      const tag = el.tagName.toLowerCase();
      if (
        tag === 'dev-chaos-apitrace-root' ||
        tag === 'wxt-shadow-root' ||
        el.id === 'dev-chaos-apitrace-root' ||
        Boolean(el.closest('dev-chaos-apitrace-root, #dev-chaos-apitrace-root, [id*="dev-chaos"]'))
      ) {
        return true;
      }
    }
    const root = el.getRootNode?.();
    if (root instanceof ShadowRoot && root.host) {
      return this.isExtensionElement(root.host);
    }
    if (el.parentElement) {
      return this.isExtensionElement(el.parentElement);
    }
    return false;
  }

  /**
   * Checks whether a browser event originated from inside the extension UI
   * across Shadow DOM boundaries via composedPath().
   */
  private isExtensionEvent(e: Event): boolean {
    const path = e.composedPath();
    for (const item of path) {
      if (this.isExtensionElement(item as Node)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Helper that traverses and modifies all text nodes inside an element and its subtree.
   */
  private stressElementSubtree(root: HTMLElement, stressText: string): number {
    if (this.isExtensionElement(root)) return 0;
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
        if (this.isExtensionElement(node.parentElement)) {
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
      if (this.isExtensionElement(input)) continue;
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
      if (this.isExtensionElement(container)) continue;
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
      if (this.isExtensionElement(img)) continue;

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

    return { restoredTexts, restoredImages, restoredLists };
  }

  /**
   * Interactive Element Picker: Allows user to click any specific element to test.
   */
  public startElementPicker(
    onPicked: (el: HTMLElement) => void,
    onCancel?: () => void
  ): void {
    // If already active, clean up previous listeners first
    this.stopElementPicker();

    this.pickerActive = true;
    this.onElementPickedCallback = onPicked;
    this.onElementPickerCancelCallback = onCancel || null;

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

      // Ignore mouse move if cursor is over extension UI (drawer, dock, etc.)
      if (this.isExtensionEvent(e)) {
        if (this.pickerHoverOverlay) this.pickerHoverOverlay.style.display = 'none';
        return;
      }

      const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
      if (!target || this.isExtensionElement(target)) {
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

      // If clicked inside the extension UI (drawer, dock, or buttons), do not pick or intercept
      if (this.isExtensionEvent(e)) {
        return;
      }

      const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
      if (!target || this.isExtensionElement(target)) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const callback = this.onElementPickedCallback;
      this.stopElementPicker();

      if (callback) {
        callback(target);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const cancelCb = this.onElementPickerCancelCallback;
        this.stopElementPicker();
        cancelCb?.();
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
      this.onElementPickedCallback = null;
      this.onElementPickerCancelCallback = null;
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
