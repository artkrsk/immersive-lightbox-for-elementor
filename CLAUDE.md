# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A PhotoSwipe-powered lightbox that replaces Elementor's native one — curtain/flight transitions, desktop drag between slides, mousemove explore pan, thumbnails, video/HTML slides. Free plugin, GPL-3.0-or-later. Phase 1 (current) is the frontend engine, developed playground-first in the VitePress docs; phase 2 adds the WordPress/Elementor integration (PHP printing, Site Settings, kit parity). Design spec: `docs/superpowers/specs/2026-08-12-better-lightbox-design.md`.

## Commands

- `pnpm test` — Vitest. Single file: `pnpm test tests/transition/curve.test.ts`.
- `pnpm typecheck` / `pnpm lint` (Biome) / `pnpm knip` / `pnpm fallow` — all hard gates, keep them green per commit. Fallow's CRAP scores read Istanbul data — run `pnpm test:coverage` first when health findings look stale.
- `pnpm docs:dev` — the playground at `localhost:5201`; **this is the browser harness**, the only place transitions/gestures are truly verified.
- `pnpm build` — release build: stamps versions from `composer.json#version` (the only version source), stages `dist/<slug>/`, zips.
- `pnpm dev:plugin` — watch mode; mirrors into a Local site only if `DEV_TARGET` is set in the gitignored `.env`.

Pre-commit (lefthook): Biome auto-fixes staged files, then typecheck, then the full test suite.

## Architecture invariants

- **PhotoSwipe 5.4.4 is a vendored fork** at `src/ts/photoswipe/` (MIT, upstream PR #2166 baked in — see its README). Promoted from a wrap on 2026-08-12: upstream is dormant, the author has run it frozen across four themes, and the wrapper seam (dims recovery dance, un-animated `goTo`, un-interceptable close that forced disabling vertical-drag/pinch close) was where the bugs bred. The fork's `gestures/` and `util/spring-*` are the battle-tested touch physics — change only with on-device verification; everything else may be integrated first-class (animated `goTo`, dims API, interceptable close) instead of worked around. Converted to TypeScript under the strict tsconfig (2026-08-12), emit-verified byte-equal; fork conventions (declare-fields, emit-neutral edits only, `arts*` options in `types.ts`) live in its README. It runs under Biome/knip/fallow-dead-code like everything else; only complexity/duplication/coverage gates stay off for it.
- **Desktop drag needs NO patching.** The Gestures constructor force-disables `allowPanToNext` on non-touch, but its sole consumer reads the option live during drag — `pswpFactory` flips it back on `beforeOpen`. (Now that the source is ours, this can become the default in a first-class pass.)
- **PhotoSwipe's close always destroys its core** (listeners wiped). Persistence lives in OUR layer (`engineState`); a fresh cheap pswp core is created per open. Never reuse a closed pswp.
- **Every close and nav path routes through the engine api** (`createLightbox`'s `close`/`nav`), never straight to pswp: `escKey`/`arrowKeys`/`bgClickAction` are disabled in `mapToPswpOptions` and reimplemented so the curtain choreography and pass-through navigation apply uniformly. `closeOnVerticalDrag`/`pinchToClose` are off until a touch-close choreography exists — revisit deliberately, not by flipping the flag.
- **One clock per transition.** Backdrop `t`, flight interpolation, and chrome opacity all read one eased value (`transition/clock.ts`). No independently-timed tweens.
- **Flight capture is geometric.** `captureFlightSource` measures the inner img rect vs frame rect — never parses transforms — so any parallax mechanism is captured identically. Close re-measures (scroll/slide may have changed) and targets the nearest visible clone via `gallery.elementsByKey`.
- **The vendored curtain-mask must stay byte-identical to @arts/curtain-mask.** `tests/transition/curve.test.ts` carries exact-string parity vectors; a "refactor" that shifts any output string is a visual change in disguise.
- **The collector always feeds PhotoSwipe an explicit dataSource** — PhotoSwipe never scans anchors (sidesteps its `<a>`-wrapper architecture constraint).
- **Zero dependencies, period** — the PhotoSwipe fork is repo source; nothing lightbox-related is installed from npm.

## Conventions

- `@ts/*` alias is test-only (enforced by `tests/aliasBoundary.test.ts`); `@engine`/`@styles` are declared twice on purpose (tsconfig for editor, docs vite config for the browser).
- DOM suites are `*.dom.test.ts` with a `// @vitest-environment happy-dom` docblock; everything else is node env and must not touch `document`. jsdom is not an option (no matchMedia).
- One declaration per file; `I*`/`T*` prefixes; barrels carry **only exports with live consumers** — knip is a hard gate, so a barrel line lands together with its first consumer.
- The public API is whatever `src/ts/index.ts` re-exports plus the contract in `docs/developers.md` (discovery global, html classes, data-attribute vocabulary). Everything else is internal.
- All shipped CSS lives in the `arts-lightbox` cascade layer (partials each declare their own `@layer` block — sass forbids `@use` inside `@layer`). The vendored `_photoswipe.scss` is a one-time hand-wrapped copy of photoswipe@5.4.4's `dist/photoswipe.css` — photoswipe is not an npm dependency and nothing regenerates the file; its own header records the provenance.
- The gate (`gate.ts`) is a separate bundle: no banner, no sourcemap (PHP prints it inline). It holds a candidate click, lazy-loads CSS→JS serialized, replays the open via the ready promise, and releases the click to native navigation on load failure.

## Known hazards (from upstream research — see spec §Known upstream hazards)

iOS dynamic toolbar vs fixed positioning, iOS Chrome missing `pointerup` corrupting pinch state, Android dead-tap after swipe-close, fast-swipe race. The `.pswp img` near-transparent background in `_lightbox.scss` is a deliberate Safari compositing fix (upstream #1846) — don't remove it as "cleanup". On-device iOS testing is part of the playground phase.
