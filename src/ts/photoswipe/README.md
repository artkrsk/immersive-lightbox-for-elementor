# Vendored PhotoSwipe fork

Forked from photoswipe@5.4.4 (MIT, see LICENSE — Dmytro Semenov) at the
`src/js` tree, with upstream PR #2166 (placeholder timing) applied. Upstream
is dormant; this copy is the maintained source of truth for the engine's
gesture physics, zoom/pan math, main scroll and image loading.

Converted to TypeScript from upstream's JS+JSDoc — a pure annotation
migration, verified emit-equal: a whitespace-minified bundle diff against
the pre-conversion baseline was byte-identical at every step.

Deviations from upstream 5.4.4:

- `lightbox/` (the PhotoSwipeLightbox lazy-loader wrapper) is removed — the
  engine constructs the core directly with an explicit dataSource and owns
  its own lazy gate (`gate.ts`).
- The language is TypeScript under the repo's strict tsconfig. `types.ts`
  is the canonical home of the options/geometry surface (photoswipe.ts
  re-exports it), including the `arts*` fork options as first-class API.
- `@arts fork` comments mark behavioral patches: `artsSeedPan`
  (slide.ts — click-seeded initial pan), `artsMouseDragNavigates` +
  `isMousePointer` (gestures/ — mouse drags navigate, never pan, while
  explore mode owns panning), `returnFocus` with `preventScroll`
  (keyboard.ts — focus goes back to the opener on close without scrolling
  it into view), `potentialIndexChange` (main-scroll.ts — dispatched from
  `moveIndexBy` once the destination is decided, with the loop-corrected
  travel sign as `direction`; `change` stays the at-rest signal).

Ground rules:

- `gestures/`, `util/spring-*` are the battle-tested touch physics — change
  them only with on-device verification.
- `canLoop()`'s `> 2` stays. At two slides both flanking holders resolve to the
  same index, and `Content` is cached per index (`slide/loader.ts`), so they
  would share one DOM node: the second `append()` no-ops on `isAttached` and
  either `destroy()` detaches what the other still owns. Independently,
  `moveIndexBy`'s wrap
  math is degenerate at two: +1 and -1 both reduce to "forward". Two-slide
  wrapping lives in `core/createNavigator.ts` as an index jump instead.
- Instance properties use the `declare` modifier with constructor
  assignment (upstream's shape): real field declarations would emit field
  definitions under ES2022 `useDefineForClassFields` and change
  own-property semantics. Keep annotation changes emit-neutral; anything
  that alters emitted JS is a behavior change and reviews as one.
- Upstream `_underscore` member names stay (greppable against upstream
  issues/docs); access control is enforced by real `private` modifiers.
- Planned first-class integrations (in place of the old wrapper fights):
  animated `goTo`, a dims-change API, an interceptable close for the curtain
  choreography, gesture-driven close, desktop `allowPanToNext` default,
  optional stock UI.
