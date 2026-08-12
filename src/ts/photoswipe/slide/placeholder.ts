import { createElement, setWidthHeight, toTransformString } from '../util/util.js';

class Placeholder {
  declare element: HTMLImageElement | HTMLDivElement | null;

  constructor(imageSrc: string | false, container: HTMLElement) {
    // Create placeholder
    // (stretched thumbnail or simple div behind the main image)
    this.element = createElement(
      'pswp__img pswp__img--placeholder',
      imageSrc ? 'img' : 'div',
      container
    );

    if (imageSrc) {
      const imgEl = this.element as HTMLImageElement;
      imgEl.decoding = 'async';
      imgEl.alt = '';
      imgEl.src = imageSrc;
      imgEl.setAttribute('role', 'presentation');
    }

    this.element.setAttribute('aria-hidden', 'true');
  }

  setDisplayedSize(width: number, height: number): void {
    if (!this.element) {
      return;
    }

    if (this.element.tagName === 'IMG') {
      // Use transform scale() to modify img placeholder size
      // (instead of changing width/height directly).
      // This helps with performance, specifically in iOS15 Safari.
      setWidthHeight(this.element, 250, 'auto');
      this.element.style.transformOrigin = '0 0';
      this.element.style.transform = toTransformString(0, 0, width / 250);
    } else {
      setWidthHeight(this.element, width, height);
    }
  }

  destroy(): void {
    if (this.element?.parentNode) {
      this.element.remove();
    }
    this.element = null;
  }
}

export default Placeholder;
