/**
 * Whether the page reads right-to-left — the same answer the lightbox's own
 * chrome mirrors on, since the root is appended to `<body>` and inherits the
 * document's direction.
 *
 * Computed direction is the primary source: a site may set direction in CSS
 * rather than markup, and only the computed value accounts for both. The
 * `dir` attribute is consulted as a fallback for environments that don't
 * resolve the UA stylesheet's `[dir]` mapping into computed styles (test DOMs
 * among them) — an explicit `dir="rtl"` is unambiguous wherever it appears.
 *
 * Read at open (a gallery is built per open); a document does not change
 * direction while a lightbox is on screen.
 *
 * Only the CHROME mirrors. The slide track keeps its physical motion in both
 * directions: a swipe is spatial, and the drag/wheel physics are shared with
 * the vendored engine.
 */
export function isRTLDocument(): boolean {
  if (typeof window === 'undefined' || !document.documentElement) {
    return false
  }
  const root = document.documentElement
  if (window.getComputedStyle(root).direction === 'rtl') {
    return true
  }
  const declared = document.body?.getAttribute('dir') ?? root.getAttribute('dir')
  return declared?.toLowerCase() === 'rtl'
}
