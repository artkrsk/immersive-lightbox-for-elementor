# Better Lightbox for Elementor — Design

Date: 2026-08-12
Status: approved in brainstorming; ready for implementation planning.

## What this is

A free, standalone WordPress plugin that replaces Elementor's native lightbox with a custom engine built on PhotoSwipe 5.4.4. Successor in spirit to the ArtsCustomGallery framework package, with **no backward compatibility** with it or the Trigger theme. First consumer: the Velum theme (WIP), which simply requires the plugin — no composer package, no promised JS API surface in v1.

The two features that earn the "Better" name:

1. **Polished open/close transition** — a curtain reveal (straight or curved edge, the Velum overlay-menu technique) sweeping the page away while the clicked image is promoted *above* the curtain and travels to its slide position, correctly un-doing parallax offset, border-radius, and overflow crop on the way. Validated in an interactive mockup during brainstorming.
2. **Desktop ergonomics PhotoSwipe never shipped** — mouse-drag between slides, mousemove pan when zoomed, zoom-to-cursor/wheel polish, next-on-click.

## Engine strategy (Approach A: wrap + surgical patches)

PhotoSwipe 5.4.4 stays an unmodified npm dependency for what it does best: touch gesture physics (pinch math, rubber-band friction, spring easer), pan-bounds/zoom-level math, image loading pipeline (Safari decode timing, srcset handling), main-scroll, keyboard/wheel, and its event/filter bus. We replace wholesale: the opener (open/close transitions), the default UI, and content handling for non-image slides.

Patches, carried via `pnpm patch` (`patchedDependencies`) so they are declarative and loud on dependency updates:

1. Remove the `allowPanToNext = false` gate for non-touch devices in `gestures/gestures.js` (3 lines) — enables desktop mouse-drag between slides. Verify drag-pan-vs-swipe axis hysteresis feels right with a mouse in the playground.
2. Upstream PR #2166 (merged after 5.4.4, never released): placeholder removal synced to animation duration instead of a hardcoded 1000ms.

Escape hatch: if the wrap layer accumulates a third and fourth patch fighting the library, promote to a full fork under the `@arts` namespace — mechanical (vendor the files), not a rewrite. Upstream is dormant (last release 2024-05; three real commits since), so divergence risk is low either way.

## Runtime architecture

Three-stage load, following the smooth-scrolling-for-elementor pattern:

1. **PHP prints, never enqueues.** One inline block on `wp_head`: options object (from `Options::build()`, filtered), versioned asset URLs, and the compiled `gate.js` contents, wrapped in optimizer opt-out markers (Autoptimize, LiteSpeed, Rocket Loader, WP Rocket). Per-request kill-switch filter. Fully inert without Elementor.
2. **`gate.ts`** — tiny pre-paint gate: installs the discovery global (`window.artsLightbox`) and `<html>` state classes, registers a capture-phase document click listener for lightbox candidates. On first candidate click it holds the click, lazy-loads engine CSS + bundle, then replays the open. Optional warm-up on `pointerover` of a candidate. In the Elementor editor preview the engine loads eagerly.
3. **Engine** — the layers below. Engine chunk load failure releases the held click to native navigation (image URL opens as a plain link).

### Engine layers

- **Collector.** Builds galleries from the DOM; PhotoSwipe always receives a custom data source and never scans anchors itself (sidesteps upstream's `<a>`-wrapper constraint, #2051). Extracts per-slide data: full-size URL, `currentSrc`, dimensions, caption, thumbnail source, type (`image | video | html`), group id, canonical key.
- **Transition engine.** Owns open/close entirely (`showHideAnimationType: 'none'`). A transition composes:
  - *Backdrop reveal*: `fade` or `curtain` preset. Curtain uses a vendored copy of Velum's `@arts/curtain-mask` (SVG clipPath in `objectBoundingBox` units, per-frame path rewrite, sine bow, `straight` inset fast path, re-pointable direction) with attribution and its exact-string parity test vectors carried over.
  - *Flight*: promoted shared-element travel of the clicked media above the curtain — captures the source's computed transform (parallax offset), border-radius, and overflow crop, interpolates them away, lands on the slide rect, then swaps to the real PhotoSwipe slide underneath. Runs whenever a source element exists; degrades to backdrop-only otherwise (programmatic opens, vanished/off-screen source at close). Close re-measures the source rect and targets the nearest visible instance of the slide's canonical key.
  - *One clock*: backdrop `t`, flight interpolation, and chrome fade are driven by a single progress value — no independently timed tweens.
  - Defaults from the validated mockup: `power2.inOut`, 800 ms, bow 0.12, curved edge. Close direction `reverse | through` is a setting (default `reverse`).
- **Gesture layer.** PhotoSwipe stock plus the two patches. Slide-to-slide navigation style is a setting: `slide` (stock main-scroll shove) or `fade` (crossfade between slides).
- **Explore enhancement.** Global option, `pointer: fine` only: while a slide is zoomed beyond fit, mousemove position maps to pan position within PhotoSwipe's pan bounds, smoothed by a rAF lerp (glides, not 1:1 tracking). Drag-pan still works; click still toggles zoom. `initialZoomLevel` covers "opens already zoomed". Zoom ergonomics polish in the same area: zoom-to-cursor-point and wheel-zoom behavior verified/tuned in the playground (upstream ask #1693).
- **UI layer.** Ours entirely, rendered into PhotoSwipe's root: counter, captions, close, arrows, thumbnail strip, optional download button, optional slideshow control. Tap handlers must not double-fire touch + synthetic click (#1938).
- **Persistent instance.** One lightbox instance per page lifecycle, reused across opens (#1513); collector caches per-group galleries with invalidation on DOM change. All instance calls guarded against post-destroy use (#2004 — Elementor editor churn).

## Behavior

- **Grouping.** Default: one group per widget/gallery. Cross-container grouping via a shared group-id data attribute. Pass-through navigation (continue into the next group at a group's end) carries over from ArtsCustomGallery as an option. New: global **"unite all images on a page"** option — every candidate joins one gallery in DOM order.
- **Clone dedup.** Canonical key = explicit `data-id`, else normalized full-size URL. Duplicates (e.g. infinite-list clones) collapse to one slide; the flight launches from the element actually clicked and returns to the nearest visible instance.
- **Video slides.** Self-hosted `<video>` and YouTube/Vimeo iframes as first-class owned modules on PhotoSwipe's content lifecycle events: correct aspect sizing on `contentResize`, play on activate, pause on deactivate. Declarative detection: URL patterns / file extensions / explicit type attribute.
- **HTML slides.** Arbitrary content referenced by selector or template; fit-only (no zoom/explore), gestures still swipe past.
- **Thumbnail strip.** Bottom of the chrome, built from slide thumbnail sources, click-to-jump, synced active state, scrollable on overflow. Global toggle, hidden on touch-width viewports. (Top community ask; PhotoSwipe has none natively.)
- **Next-on-click.** Image click action setting: `zoom` (stock default) | `next` (#1123) | `none`.
- **Download button.** Optional UI button using the full-size URL (#1216 — long-press-save is broken by touch handling on mobile).
- **Slideshow.** Optional autoplay: interval setting, play/pause control, pauses on any user interaction (#753).
- **Cursor-follower integration.** Wire-level only: when cursor-follower is active, our controls print `data-arts-cursor-follower-target` payloads (magnetic arrows, hover states); inert strings otherwise. Nothing else crosses the boundary.
- **Keyboard/wheel.** PhotoSwipe stock behavior retained.

## Elementor integration (phase 2)

- Recognizes Elementor's lightbox markup (`data-elementor-open-lightbox`, gallery widgets, single-media links) and respects the per-widget "Lightbox: Default / Yes / No" control.
- **Site Settings tab** on the kit with the global options: enable, transition preset, curtain edge, close direction, duration, easing, explore mode, image click action, wheel zoom, slide-change style, unite-all, pass-through, thumbnails, download button, slideshow (+ interval).
- **PHP/TS parity invariant** (the smooth-scrolling rule): `Options::build()` (PHP) and the TS kit-settings mapper must derive the identical options shape from the same kit controls; shared fixtures test both sides.
- **Editor bridge**: `$e` UI-After hook forwards kit-setting changes into the preview iframe as a CustomEvent; engine re-inits live. Edit-mode detection: engine loads eagerly in the preview but never hijacks clicks while editing.
- **Public contract** (documented in `docs/developers.md`, additive-only): `arts_better_lightbox/enabled` and `arts_better_lightbox/options` PHP filters, the `<html>` state classes, the discovery global (presence/ready detection only — not a programmatic open API), and the data-attribute vocabulary (group id, slide type, canonical id, per-element opt-out). Elementor control IDs stay internal.

## Packaging & distribution

- **Fully free**, GPL-3.0-or-later, no licensing/updater/EDD plumbing. Packaging is wp.org-ready (readme.txt, license headers, human-readable source with build instructions; PhotoSwipe is MIT — compatible).
- Standalone plugin only: `src/wordpress-plugin/` bootstrap, PSR-4 `Arts\BetterLightbox\` → `src/php/`, text domain `better-lightbox-for-elementor`.
- Toolchain identical to siblings: pnpm, custom esbuild/sass harness in `build/` driven by `project.config.js`, Biome, lefthook, knip, Vitest, PHPStan max with Elementor stubs. Version single-sourced from `composer.json`, stamped by the build; release = bump, build, `v*` tag.
- `dev:plugin` watch mode mirrors into a Local site via gitignored `.env` `DEV_TARGET`.

## Playground-first workflow (phase 1)

The cursor-follower pattern: a VitePress `docs/` site that doubles as the browser harness — the engine boots on every page, `@engine`/`@styles` aliases into real source, demo fixtures single-sourced (`?raw` import for live render + markdown include for displayed code). `docs/developers.md` is the executable public-contract page.

Fixture pages reproduce the hard cases: parallax images with radius + overflow crop; infinite list with cloned nodes; mixed image/video/HTML gallery; grouped vs united galleries; tall image for explore mode; fast-swipe stress; large-image zoom (iOS flicker check). The engine is built and tuned entirely here before any Elementor code is written.

## Known upstream hazards (and what we do about them)

- **iOS dynamic toolbar vs fixed positioning** (#2163, #1828): our backdrop/viewport sizing must tolerate toolbar show/hide — custom viewport measurement + safe-area insets; on-device testing is part of phase 1.
- **iOS Chrome missing pointerup corrupts pinch state** (#2068) and **Android dead-tap after swipe-close** (#2013): inherited gesture-layer hazards → playground regression fixtures; candidate third patch only if a clean fix emerges.
- **Safari compositing quirks**: near-transparent `background` on slide images fixes truncated first paint (#1846); attempt `-webkit-touch-callout`/`user-select` suppression for Visual Look Up (#1879, unproven upstream).
- **Fast-swipe race** (#1834) and **srcset sizes vs zoom** bug class: regression-check against 5.4.4 in the playground; upstream's 2025 bulk-close marked issues "completed" without fixes, so closed ≠ fixed there.
- **Shadow DOM** is explicitly unsupported (upstream #2096/#2097 trade-off introduces a drag-release regression; Elementor doesn't render into shadow roots).

## Testing

- Vitest, node env by default; DOM suites opt into happy-dom via `*.dom.test.ts` naming (the smooth-scrolling convention).
- Unit: collector grouping/unite/dedup, slide-type detection, flight interpolation math, canonical-key normalization, options parity PHP↔TS via shared fixtures, curtain geometry with Velum's exact-string parity vectors.
- Browser truth lives in the playground fixtures (gesture feel, transitions, iOS behavior — on device).
- PHPStan level max over `src/php` before any PHP ships.

## Error handling

- Engine bundle load failure → held click released to native navigation.
- Image load failure inside the lightbox → PhotoSwipe's stock error slide, restyled.
- Source element gone at close → backdrop-only close.
- Post-destroy instance calls → guarded no-ops.

## Out of scope (v1)

- Composer dual-ship / theme symlink consumption; any promised programmatic JS API (the declarative data-attribute contract is the surface).
- ArtsCustomGallery/Trigger compatibility.
- Accessibility work beyond PhotoSwipe's stock behavior (per standing project convention; upstream a11y asks noted, not adopted).
- Deep-linking/URL hash, RTL, panoramic/360 content, shadow DOM support, pinch-to-open from page (#1677).

## Assumptions to confirm during review

- "All" steals included slide-to-slide transition styles: v1 ships `slide | fade` as a slide-change setting. Curtain *between* slides is explicitly not in v1.
- Curtain edge default `curved`, close direction default `reverse` — both remain user-facing settings; defaults are tunable during phase 1 without spec changes.
