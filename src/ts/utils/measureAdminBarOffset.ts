/**
 * How far the WP admin bar intrudes into the viewport RIGHT NOW — the bar's
 * rect bottom, clamped. Measured, not derived from body classes or WP's
 * height var: below 600px core makes the bar `position: absolute`, so it may
 * be scrolled out of view while still "present", and the editor preview
 * exposes WP's var while rendering no bar at all. Absent bar (visitors,
 * editor) measures 0. Scroll is locked while the lightbox is open, so the
 * value only moves on resize — re-read it there.
 */
export function measureAdminBarOffset(): number {
  const bar = document.getElementById('wpadminbar')
  if (!bar) {
    return 0
  }
  return Math.max(0, Math.round(bar.getBoundingClientRect().bottom))
}
