/**
 * Handle over a page <video> adopted into the lightbox. `take()` pins the
 * page-owned style channels (parallax translate/scale) and hands the live
 * element over — call it in the same task as the reparent. `return()`
 * restores mute FIRST, then placement and every recorded property;
 * idempotent, safe as a destroy-path fallback.
 */
export interface IAdoptedVideo {
  element: HTMLVideoElement
  take(): HTMLVideoElement
  return(): void
}
