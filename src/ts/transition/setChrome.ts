const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))

/** Chrome (counter, captions, buttons) rides the tail of the shared clock. */
export function setChrome(root: HTMLElement, t: number): void {
  root.style.setProperty('--arts-lightbox-chrome', String(clamp01((t - 0.65) / 0.35)))
}
