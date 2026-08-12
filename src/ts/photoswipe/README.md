# Vendored PhotoSwipe fork

Forked from photoswipe@5.4.4 (MIT, see LICENSE — Dmytro Semenov) at the
`src/js` tree, with upstream PR #2166 (placeholder timing) applied. Upstream
is dormant; this copy is the maintained source of truth for the engine's
gesture physics, zoom/pan math, main scroll and image loading.

Deviations from upstream 5.4.4:

- `lightbox/` (the PhotoSwipeLightbox lazy-loader wrapper) is removed — the
  engine constructs the core directly with an explicit dataSource and owns
  its own lazy gate (`gate.ts`), so the wrapper was 300 dead lines.

Ground rules:

- `gestures/`, `util/spring-*` are the battle-tested touch physics — change
  them only with on-device verification.
- Files stay plain JS with JSDoc types (tsc `allowJs` infers the types;
  the code itself is not strict-checked).
- Excluded from Biome, knip and coverage — upstream style is preserved to
  keep diffs against 5.4.4 reviewable.
- Planned first-class integrations (in place of the old wrapper fights):
  animated `goTo`, a dims-change API, an interceptable close for the curtain
  choreography, gesture-driven close, desktop `allowPanToNext` default.
