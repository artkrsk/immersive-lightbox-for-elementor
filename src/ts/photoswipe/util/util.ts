import type { ElementProvider, Point } from '../types.js';

export function createElement<T extends keyof HTMLElementTagNameMap>(
  className: string,
  tagName: T,
  appendToEl?: Node
): HTMLElementTagNameMap[T] {
  const el = document.createElement(tagName);
  if (className) {
    el.className = className;
  }
  if (appendToEl) {
    appendToEl.appendChild(el);
  }
  return el;
}

export function equalizePoints(p1: Point, p2: Point): Point {
  p1.x = p2.x;
  p1.y = p2.y;
  if (p2.id !== undefined) {
    p1.id = p2.id;
  }
  return p1;
}

export function roundPoint(p: Point): void {
  p.x = Math.round(p.x);
  p.y = Math.round(p.y);
}

/**
 * Returns distance between two points.
 */
export function getDistanceBetween(p1: Point, p2: Point): number {
  const x = Math.abs(p1.x - p2.x);
  const y = Math.abs(p1.y - p2.y);
  return Math.sqrt((x * x) + (y * y));
}

/**
 * Whether X and Y positions of points are equal
 */
export function pointsEqual(p1: Point, p2: Point): boolean {
  return p1.x === p2.x && p1.y === p2.y;
}

/**
 * The float result between the min and max values.
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

/**
 * Get transform string
 */
export function toTransformString(x: number, y?: number, scale?: number): string {
  let propValue = `translate3d(${x}px,${y || 0}px,0)`;

  if (scale !== undefined) {
    propValue += ` scale3d(${scale},${scale},1)`;
  }

  return propValue;
}

/**
 * Apply transform:translate(x, y) scale(scale) to element
 */
export function setTransform(el: HTMLElement, x: number, y?: number, scale?: number): void {
  el.style.transform = toTransformString(x, y, scale);
}

const defaultCSSEasing = 'cubic-bezier(.4,0,.22,1)';

/**
 * Apply CSS transition to element
 *
 * @param el
 * @param prop CSS property to animate
 * @param duration in ms
 * @param ease CSS easing function
 */
export function setTransitionStyle(
  el: HTMLElement,
  prop?: string,
  duration?: number,
  ease?: string
): void {
  // inOut: 'cubic-bezier(.4, 0, .22, 1)', // for "toggle state" transitions
  // out: 'cubic-bezier(0, 0, .22, 1)', // for "show" transitions
  // in: 'cubic-bezier(.4, 0, 1, 1)'// for "hide" transitions
  el.style.transition = prop
    ? `${prop} ${duration}ms ${ease || defaultCSSEasing}`
    : 'none';
}

/**
 * Apply width and height CSS properties to element
 */
export function setWidthHeight(el: HTMLElement, w: string | number, h: string | number): void {
  el.style.width = (typeof w === 'number') ? `${w}px` : w;
  el.style.height = (typeof h === 'number') ? `${h}px` : h;
}

export function removeTransitionStyle(el: HTMLElement): void {
  setTransitionStyle(el);
}

/* decode() is missing from ancient engines — modeled optional here (lib.dom
   marks it required), which is the exact reason for the runtime guard. */
export function decodeImage(
  img: Omit<HTMLImageElement, 'decode'> & { decode?: () => Promise<void> }
): Promise<HTMLImageElement | void> {
  if ('decode' in img) {
    return img.decode().catch(() => {});
  }

  if (img.complete) {
    return Promise.resolve(img as HTMLImageElement);
  }

  return new Promise((resolve, reject) => {
    img.onload = () => resolve(img as HTMLImageElement);
    img.onerror = reject;
  });
}

export const LOAD_STATE: { IDLE: 'idle'; LOADING: 'loading'; LOADED: 'loaded'; ERROR: 'error' } = {
  IDLE: 'idle',
  LOADING: 'loading',
  LOADED: 'loaded',
  ERROR: 'error',
};

export type LoadState = (typeof LOAD_STATE)[keyof typeof LOAD_STATE];

/**
 * Check if click or keydown event was dispatched
 * with a special key or via mouse wheel.
 */
export function specialKeyUsed(e: MouseEvent | KeyboardEvent): boolean {
  return ('button' in e && e.button === 1) || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey;
}

/**
 * Parse `gallery` or `children` options.
 */
export function getElementsFromOption(
  option?: ElementProvider,
  legacySelector?: string,
  parent: HTMLElement | Document = document
): HTMLElement[] {
  let elements: HTMLElement[] = [];

  if (option instanceof Element) {
    elements = [option as HTMLElement];
  } else if (option instanceof NodeList || Array.isArray(option)) {
    elements = Array.from(option);
  } else {
    const selector = typeof option === 'string' ? option : legacySelector;
    if (selector) {
      elements = Array.from(parent.querySelectorAll(selector));
    }
  }

  return elements;
}

/**
 * Check if variable is PhotoSwipe class
 */
export function isPswpClass(fn: any): boolean {
  return typeof fn === 'function'
    && fn.prototype
    && fn.prototype.goTo;
}

/**
 * Check if browser is Safari
 */
export function isSafari(): boolean {
  return !!(navigator.vendor && navigator.vendor.match(/apple/i));
}
