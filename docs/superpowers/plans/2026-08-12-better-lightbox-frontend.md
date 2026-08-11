# Better Lightbox for Elementor — Frontend (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the playground-first TypeScript lightbox engine (collector, curtain+flight transitions, explore mode, custom UI, video/HTML slides) inside a fully scaffolded plugin repo, drivable end-to-end in a VitePress playground — no Elementor/PHP integration yet.

**Architecture:** PhotoSwipe 5.4.4 (raw `PhotoSwipe` class, statically bundled) supplies gestures, zoom/pan math, and image loading; our engine owns the collector (DOM → slide model), the transition engine (curtain backdrop via vendored `@arts/curtain-mask` + promoted flight element on one shared progress clock), the explore/zoom ergonomics, and the entire UI layer. Persistence lives in our engine (caches, masks, UI); a cheap pswp core is created per open because PhotoSwipe's close always destroys it.

**Tech Stack:** TypeScript (strict, ES2022), esbuild + sass via the sibling `build/` harness, Vitest (node default; happy-dom opt-in), VitePress playground, Biome, knip, lefthook, pnpm.

**Context:** Spec approved at `docs/superpowers/specs/2026-08-12-better-lightbox-design.md` (read it before starting). Repo `/Users/art/Projects/Plugins/better-lightbox-for-elementor` is empty except `docs/superpowers/` and `.superpowers/`. Scaffold template: `/Users/art/Projects/Plugins/cursor-follower-for-elementor` (CF below). Curtain source: `/Users/art/Projects/Themes/Velum/DEV/modules/curtain-mask` (CM below). Working choreography reference (validated with the user): `.superpowers/brainstorm/87290-1786470134/content/open-transition.html`.

## Global Constraints

- Naming: slug `better-lightbox-for-elementor`; npm `@arts/better-lightbox`; PHP ns (stub only) `Arts\BetterLightbox\`; esbuild define `__ARTS_BETTER_LIGHTBOX_VERSION__`; PHP version constant `ARTS_BETTER_LIGHTBOX_PLUGIN_VERSION`; globals `window.artsLightbox` (discovery), `window.artsBetterLightboxOptions`, `window.artsBetterLightboxBoot`; `<html>` classes `has-arts-lightbox`/`no-arts-lightbox`; events `arts-lightbox:*`; CSS cascade layer `arts-lightbox`.
- `composer.json#version` is the only version source (build stamps the rest). Start at `0.1.0`.
- Zero runtime `dependencies` in package.json; `photoswipe@5.4.4` lives in devDependencies and is bundled by esbuild (CF convention — fallow rule for this is already disabled in the copied config).
- Code style: curly braces always (even one-liners); one declaration per file; `I*` interfaces / `T*` types, one per file, in `interfaces/`/`types/` with barrel `index.ts`; consumers import via barrels, declaration files import directly; `/** ... */` comments at interface level, implementations stay clean.
- `@ts/*` alias is test-only (enforced by `tests/aliasBoundary.test.ts`); `@engine`/`@styles` are declared in both `tsconfig.json` and `docs/.vitepress/config.mts`.
- DOM test suites are named `*.dom.test.ts` with `// @vitest-environment happy-dom` docblock; everything else runs in node env and must not touch `document`.
- Transition defaults (user-validated): `power2.inOut`, 800 ms, bow 0.12, curved edge, close `reverse`.
- Out of scope: Elementor/PHP integration (phase 2), deep-linking, a11y beyond PhotoSwipe stock, RTL, shadow DOM.
- Every task ends with a commit (user approved commit-per-task via plan approval). Repo starts un-initialized — Task 1 runs `git init`.

---

### Task 1: Repo scaffold from cursor-follower

**Files:**
- Create: `.gitignore`, `package.json`, `pnpm-workspace.yaml`, `tsconfig.json`, `vitest.config.ts`, `biome.json`, `knip.json`, `lefthook.yml`, `project.config.js`, `composer.json`, `.env.example`, `build/*` (9 files), `tests/aliasBoundary.test.ts`, `tests/setup.ts`, `src/ts/{boot.ts,gate.ts,index.ts,env.d.ts,global.d.ts}`, `src/styles/index.scss`, `src/php/.gitkeep`, `src/wordpress-plugin/{better-lightbox-for-elementor.php,readme.txt}`

**Interfaces:**
- Consumes: CF repo as template.
- Produces: a repo where `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `node build/index.js build` all succeed; `project.config.js` with `entry: { ts: './src/ts/boot.ts', gate: './src/ts/gate.ts', sass: './src/styles/index.scss' }`.

- [ ] **Step 1: git init + first commit of the existing spec**
```bash
cd /Users/art/Projects/Plugins/better-lightbox-for-elementor
git init -b main
printf 'node_modules/\ndist/\nvendor/\ncoverage/\n.env\n.DS_Store\nsrc/php/libraries/\ndocs/.vitepress/cache/\ndocs/.vitepress/dist/\n.superpowers/\n' > .gitignore
git add .gitignore docs/superpowers/specs/
git commit -m "chore: repo init with design spec"
```
- [ ] **Step 2: copy scaffold files from CF, then rename identities**
Copy verbatim: `build/` (all 9 files), `biome.json`, `knip.json`, `lefthook.yml`, `pnpm-workspace.yaml`, `tsconfig.json`, `vitest.config.ts`, `tests/aliasBoundary.test.ts`, `tests/setup.ts`, `.env.example`. Then adapt (project-wide case-sensitive replace):
  - `@arts/cursor-follower` → `@arts/better-lightbox`; `cursor-follower-for-elementor` → `better-lightbox-for-elementor`; `Arts\CursorFollower` → `Arts\BetterLightbox`; `ARTS_CURSOR_FOLLOWER_PLUGIN_VERSION` → `ARTS_BETTER_LIGHTBOX_PLUGIN_VERSION`; `__ARTS_CURSOR_VERSION__` → `__ARTS_BETTER_LIGHTBOX_VERSION__`; `artsCursor` globals per Global Constraints.
  - `package.json`: keep CF devDependency versions; drop `fallow`, `blueprint:build`, `docs:*` scripts for now (docs added in Task 3); add `"photoswipe": "5.4.4"` to devDependencies (exact, no caret — we patch it).
  - `composer.json`: version `0.1.0`, name `arts/better-lightbox`, description "PhotoSwipe-powered lightbox for Elementor.", `plugin`/`wordpress` blocks mirroring CF's shape with the new name/URI/Text Domain, GPL-3.0-or-later. No `require-dev` yet (PHPStan comes with phase 2) — also delete the `phpstan` script from package.json and the phpstan job from `lefthook.yml`.
- [ ] **Step 3: minimal source stubs so typecheck/build have entries**
`src/ts/boot.ts`: `export {}` placeholder comment `/** WordPress engine entry — wired in Task 13 */`. `src/ts/gate.ts`: same pattern. `src/ts/index.ts`: `/** Public boundary — curated re-exports only */ export {}`. `src/ts/env.d.ts`: copy CF's, rename define to `__ARTS_BETTER_LIGHTBOX_VERSION__`. `src/ts/global.d.ts`: `declare global { interface Window { artsLightbox?: unknown } } export {}` (typed properly in Task 13). `src/styles/index.scss`: `@layer arts-lightbox {}`. `src/wordpress-plugin/better-lightbox-for-elementor.php`: CF's bootstrap header shape with new identity, body only defines the version constant and returns (real bootstrap is phase 2). `readme.txt`: minimal header + `== Changelog ==` with `= 0.1.0 =` entry.
- [ ] **Step 4: install + verify all gates**
```bash
pnpm install
pnpm typecheck && pnpm test && pnpm lint && node build/index.js build
```
Expected: all pass (tests: aliasBoundary suite only), `dist/better-lightbox-for-elementor/` staged + zipped. If `build/package.js` asserts on missing files, adjust the stub until `assertRelease` passes — do not weaken the assert.
- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "chore: scaffold build harness and toolchain from cursor-follower template"
```

### Task 2: Vendor curtain-mask with parity tests

**Files:**
- Create: `src/ts/transition/curtainMask/{CurtainMask.ts,curve.ts,index.ts}`
- Test: `tests/transition/curve.test.ts`, `tests/transition/curtainMask.dom.test.ts`

**Interfaces:**
- Consumes: CM sources (`src/CurtainMask.ts`, `src/curve.ts`) and tests (`tests/curve.test.ts`, `tests/mask.test.ts`).
- Produces: `class CurtainMask` (`attach(el)`, `detach()`, `setProgress(t, bow?)`, `setDirection(d)`, `revert()`), `curvedEdgePath(t, bow, direction?, points?)`, `straightInset(t, direction?)`, `bellBow(t, strength)`, `DEFAULT_POINTS`, `type TCurtainDirection = 'left'|'right'|'top'|'bottom'` — exact CM API, re-exported through `curtainMask/index.ts`.

- [ ] **Step 1: copy CM test files first (they are the spec), adapt imports to `@ts/transition/curtainMask`**
Carry the byte-for-byte parity vectors verbatim — e.g. `curvedEdgePath(0.3, 0.05, 'right')` must equal the exact `M0.7000,0.0000 L0.6922,0.0500 … L1,1 L1,0 Z` string from CM's `tests/curve.test.ts` (copy all four vector cases + edge/corner/clamp/bellBow cases). Convert mask DOM tests to `*.dom.test.ts` with the happy-dom docblock.
- [ ] **Step 2: run to verify failure** — `pnpm test tests/transition` → FAIL (module not found).
- [ ] **Step 3: copy `CurtainMask.ts` + `curve.ts` from CM, add `index.ts` barrel; adjust only formatting to Biome (no logic changes — the parity vectors will catch drift). Add a header comment: `/** Vendored from Velum @arts/curtain-mask (same author). Keep byte-parity with its curve tests. */`
- [ ] **Step 4: run to verify pass** — `pnpm test tests/transition` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: vendor curtain-mask with byte-parity tests"`

### Task 3: VitePress playground booting a stub engine

**Files:**
- Create: `docs/.vitepress/config.mts`, `docs/.vitepress/theme/{index.ts,Layout.vue,components/LightboxDemo.vue,demos.css}`, `docs/index.md`, `docs/demos/basic-grid.html`, `src/ts/core/createLightbox.ts`, `src/ts/interfaces/{ILightbox.ts,index.ts}`
- Modify: `package.json` (add `vitepress 2.0.0-alpha.18` devDependency + `docs:dev|build|preview` scripts, port **5201**), `knip.json` (add docs entries like CF)

**Interfaces:**
- Produces: `createLightbox(options?: Partial<IOptions>): ILightbox` where `ILightbox = { init(): void; destroy(): void; open(el: HTMLElement): boolean; readonly version: string }` (stub bodies; real behavior lands in Tasks 7–9). `LightboxDemo.vue` takes `html: string` prop, renders via `v-html` in a `.lightbox-demo__stage`.

- [ ] **Step 1: write `tests/core/createLightbox.test.ts`** — asserts `createLightbox()` returns an object with `init`/`destroy`/`open` functions and `version === '0.0.0-test'` (from the vitest define). Run → FAIL.
- [ ] **Step 2: implement stub `createLightbox` (returns inert object; `open()` returns `false`), re-export from `src/ts/index.ts`. Run → PASS.
- [ ] **Step 3: docs scaffold** — copy CF's `docs/.vitepress/config.mts` (retitle, port 5201, same `@engine`/`@styles` vite aliases) and theme wiring: `theme/index.ts` imports `@styles/index.scss` + `./demos.css`, registers `LightboxDemo`; `Layout.vue` on mount builds the discovery global by hand (`window.artsLightbox = { ready, get, version: 'docs' }` — do NOT reuse boot.ts) and calls `createLightbox().init()`. `docs/index.md` embeds `basic-grid.html` via the CF single-source pattern:
```md
<script setup>
import basicGrid from './demos/basic-grid.html?raw'
</script>
<LightboxDemo :html="basicGrid" />

<<< @/demos/basic-grid.html
```
`basic-grid.html`: three `<a href="<full>.jpg" data-arts-lightbox><img …></a>` items (use picsum.photos seeded URLs; the attribute vocabulary lands properly in Task 5).
- [ ] **Step 4: verify** — `pnpm docs:dev`, open `http://localhost:5201`: page renders the grid, console shows no errors, `window.artsLightbox.version === 'docs'`. `pnpm typecheck && pnpm test && pnpm knip` pass.
- [ ] **Step 5: Commit** — `git commit -m "feat: vitepress playground boots stub engine"`

### Task 4: Options model

**Files:**
- Create: `src/ts/types/{TTransitionPreset.ts,TCurtainEdge.ts,TCloseDirection.ts,TEasingName.ts,TSlideChangeStyle.ts,TImageClickAction.ts,TSlideType.ts,TDeepPartial.ts,index.ts}`, `src/ts/interfaces/IOptions.ts`, `src/ts/constants/{defaults.ts,index.ts}`, `src/ts/core/mergeOptions.ts`, `src/ts/core/easings.ts`
- Test: `tests/core/{mergeOptions.test.ts,easings.test.ts}`

**Interfaces:**
- Produces:
```ts
interface IOptions {
  transition: { preset: TTransitionPreset; edge: TCurtainEdge; close: TCloseDirection; duration: number; easing: TEasingName; bow: number }
  explore: { enabled: boolean; smoothing: number }          // smoothing = lerp factor 0..1 per frame
  zoom: { imageClickAction: TImageClickAction; wheelToZoom: boolean }
  slideChange: TSlideChangeStyle                            // 'slide' | 'fade'
  gallery: { uniteAll: boolean; passThrough: boolean; loop: boolean }
  ui: { thumbnails: boolean; download: boolean; counter: boolean; captions: boolean; backdropOpacity: number }
  slideshow: { enabled: boolean; interval: number }         // ms
  desktopDrag: boolean
}
```
Types: `TTransitionPreset = 'fade'|'curtain'`, `TCurtainEdge = 'straight'|'curved'`, `TCloseDirection = 'reverse'|'through'`, `TEasingName = 'power2.inOut'|'power4.inOut'|'expo.inOut'|'expo.out'|'circ.inOut'`, `TImageClickAction = 'zoom'|'next'|'none'`, `TSlideType = 'image'|'video'|'html'`. `DEFAULT_OPTIONS: IOptions` (transition: curtain/curved/reverse/800/'power2.inOut'/0.12; explore off, smoothing 0.12; zoom: 'zoom'/false; slideChange 'slide'; gallery: uniteAll false, passThrough false, loop true; ui: thumbnails false, download false, counter true, captions true, backdropOpacity 1; slideshow off/5000; desktopDrag true). `mergeOptions(partial?: TDeepPartial<IOptions>): IOptions` (deep merge over defaults). `EASINGS: Record<TEasingName, (t: number) => number>` — port the five functions verbatim from the mockup file.

- [ ] **Step 1: failing tests** — mergeOptions: returns defaults when called empty; deep-merges nested partials (`{transition:{duration:1200}}` keeps other transition keys); does not mutate `DEFAULT_OPTIONS`. easings: each fn maps 0→0 and 1→1; `power2.inOut(0.5) === 0.5`; `expo.out(0.5) ≈ 0.96875`.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement. **Step 4:** run → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: options model with validated transition defaults"`

### Task 5: Collector — candidates and slide data

**Files:**
- Create: `src/ts/constants/{attributes.ts,selectors.ts,urlPatterns.ts}`, `src/ts/interfaces/{ISlideData.ts,ICandidate.ts}`, `src/ts/collector/{detectSlideType.ts,extractSlideData.ts,findCandidates.ts}`
- Test: `tests/collector/{detectSlideType.test.ts,extractSlideData.dom.test.ts,findCandidates.dom.test.ts}`

**Interfaces:**
- Produces: attribute vocabulary (constants): `data-arts-lightbox` (opt-in marker), `data-arts-lightbox-group`, `data-arts-lightbox-id`, `data-arts-lightbox-type`, `data-arts-lightbox-caption`, `data-arts-lightbox-html` (selector ref for html slides), `data-arts-lightbox-off` (opt-out).
```ts
interface ISlideData {           // engine slide model; superset mapped onto PhotoSwipe SlideData
  key: string                    // canonical: data-arts-lightbox-id ?? normalized full-size URL
  type: TSlideType
  src: string                    // full-size URL (anchor href or explicit)
  width?: number; height?: number
  msrc?: string                  // thumb currentSrc for placeholder
  caption?: string
  html?: string                  // html slides: resolved content
  videoSrc?: string; videoEmbed?: 'youtube'|'vimeo'|null
}
interface ICandidate { element: HTMLElement; data: ISlideData; groupId: string | null }
detectSlideType(href: string, explicit?: string | null): TSlideType   // pure: /\.(mp4|webm|mov)$/i or YT/Vimeo URL patterns → 'video'; explicit attr wins
extractSlideData(el: HTMLElement): ISlideData                          // reads anchor + inner img (currentSrc, naturalish dims from width/height attrs or data attrs), caption from data attr → figcaption → img alt
findCandidates(root: ParentNode): ICandidate[]                         // matches `a[data-arts-lightbox]` etc., skips `[data-arts-lightbox-off]`, resolves groupId from own attr or closest group container
```

- [ ] **Step 1: failing tests.** `detectSlideType` (node env, pure): `.mp4` → video; `youtube.com/watch?v=` + `youtu.be/` + `vimeo.com/123` → video with embed kind; `.jpg` → image; explicit `"html"` wins over href. `extractSlideData`/`findCandidates` (dom tests): build fixture markup with `document.body.innerHTML`, assert extraction incl. caption fallback chain and opt-out skipping.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement (keep URL normalization for `key` in a small helper: strip hash + tracking params, keep origin+path+meaningful query). **Step 4:** run → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: collector candidate detection and slide data extraction"`

### Task 6: Collector — grouping, dedup, gallery resolution

**Files:**
- Create: `src/ts/interfaces/{IGallery.ts,IOpenRequest.ts}`, `src/ts/collector/{buildGalleries.ts,resolveOpenRequest.ts}`
- Test: `tests/collector/buildGalleries.dom.test.ts`

**Interfaces:**
- Consumes: `findCandidates`, `ISlideData`, `IOptions['gallery']`.
- Produces:
```ts
interface IGallery { id: string; slides: ISlideData[]; elementsByKey: Map<string, HTMLElement[]> }  // elements lists every DOM instance of a key, DOM order
interface IOpenRequest { gallery: IGallery; index: number; sourceElement: HTMLElement }
buildGalleries(root: ParentNode, opts: IOptions['gallery']): IGallery[]   // uniteAll → single gallery in DOM order; else one per groupId (ungrouped candidates: each widget-container = own gallery, key = generated)
resolveOpenRequest(el: HTMLElement, galleries: IGallery[]): IOpenRequest | null  // clicked element → its gallery + canonical slide index (dedup: clones collapse to one slide; clicked clone still resolves)
neighborGallery(current: IGallery, galleries: IGallery[], dir: 1 | -1): IGallery | null   // pass-through support: galleries keep DOM order; null at the ends
```
Pass-through navigation (`opts.gallery.passThrough`): consumed by the nav path in Task 11 — at the last slide, `next` jumps to `neighborGallery(...)`'s first slide (close current pswp without transition, reopen at the neighbor, backdrop persists); disabled or no neighbor → stock loop/stop behavior. Add a dom test case: 2 groups, passThrough on → neighbor resolution in DOM order.

- [ ] **Step 1: failing dom tests** — fixtures: (a) two groups of 2+3 images → 2 galleries, order preserved; (b) `uniteAll: true` → 1 gallery of 5; (c) infinite-list fixture where the same URL appears 3× → gallery has 1 slide, `elementsByKey.get(key).length === 3`, clicking clone #2 resolves index of the canonical slide with `sourceElement` = clone #2; (d) explicit `data-arts-lightbox-id` overrides URL key.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement. **Step 4:** run → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: gallery grouping, unite-all and clone dedup"`

### Task 7: PhotoSwipe wrapper + patch

**Files:**
- Create: `src/ts/core/{pswpFactory.ts,mapToPswpOptions.ts,engineState.ts}`, `patches/photoswipe@5.4.4.patch` (generated by pnpm)
- Modify: `src/ts/core/createLightbox.ts` (wire real open path), `package.json` (`pnpm.patchedDependencies`)
- Test: `tests/core/mapToPswpOptions.test.ts`

**Interfaces:**
- Consumes: `IGallery`, `IOpenRequest`, `IOptions`.
- Produces:
```ts
mapToPswpOptions(opts: IOptions, gallery: IGallery, index: number): PhotoSwipeOptions
// dataSource from ISlideData[] (src/msrc/width/height/alt; type 'image' only here — video/html land in Task 12),
// index, showHideAnimationType:'none', bgOpacity: 0 (we own the backdrop), imageClickAction from opts.zoom
// ('none' → false), wheelToZoom, loop: opts.gallery.loop, counter/zoom/arrowPrev/arrowNext/close: false (our UI)
createPswp(opts: IOptions, req: IOpenRequest): PhotoSwipe
// new PhotoSwipe(mapped); on 'beforeOpen': if (opts.desktopDrag) { pswp.options.allowPanToNext = true }  ← undoes the
// constructor's non-touch gate (research-verified: sole consumer reads options live at drag time); pswp.init()
```
`engineState.ts`: module-scope singleton holding current pswp (null when closed), cached galleries per root, the CurtainMask instance, guards every public call against destroyed state (PhotoSwipe destroy wipes listeners — never reuse a closed pswp).
- [ ] **Step 1: apply the #2166 patch**
```bash
pnpm patch photoswipe@5.4.4
# in the emitted dir edit src/js/slide/content.js removePlaceholder(): replace the hardcoded 1000ms
# setTimeout delay with (this.instance.pswp?.options?.showAnimationDuration ?? 500) + 500, matching
# upstream PR #2166 (merged post-5.4.4, unreleased). Also mirror the change into dist/photoswipe.esm.js
# (the build consumes dist) — grep for the `1000` timeout in removePlaceholder there.
pnpm patch-commit <emitted-dir>
```
Verify: `git diff package.json` shows `patchedDependencies`; `pnpm install` clean.
- [ ] **Step 2: failing test for `mapToPswpOptions`** (node env, pure): given a 3-slide gallery + defaults → dataSource length 3, `showHideAnimationType === 'none'`, `imageClickAction === 'zoom'`; with `zoom.imageClickAction:'none'` → `false`; with `ui.counter:true` still `counter: false` in pswp opts (ours renders it). Run → FAIL. **Step 3:** implement. **Step 4:** PASS.
- [ ] **Step 4b: wire `createLightbox.open(el)`**: resolveOpenRequest → createPswp → true; document delegated click listener (capture) on `init()` for candidate selectors calling `open()`; `destroy()` closes pswp + removes listener. Playground check: clicking a grid image opens PhotoSwipe instantly (no transition yet), drag-swipe between slides works with a mouse, Esc closes.
- [ ] **Step 5: Commit** — `git commit -m "feat: photoswipe wrapper with desktop drag and placeholder patch"`

### Task 8: Transition foundation — clock, capture, flight math

**Files:**
- Create: `src/ts/interfaces/{IFlightSource.ts,IFlightTarget.ts,IFlightFrame.ts,IRect.ts}`, `src/ts/transition/{clock.ts,captureFlightSource.ts,computeSlideRect.ts,interpolateFlight.ts,flightLayer.ts}`
- Test: `tests/transition/{clock.test.ts,interpolateFlight.test.ts,captureFlightSource.dom.test.ts}`

**Interfaces:**
- Produces:
```ts
interface IRect { x: number; y: number; w: number; h: number }
interface IFlightSource { rect: IRect; radius: number; innerHeightPct: number; innerOffsetYPct: number; src: string }
interface IFlightTarget { rect: IRect; radius: number }
interface IFlightFrame extends IRect { radius: number; innerHeightPct: number; innerOffsetYPct: number }
createClock(duration: number, ease: (t:number)=>number, onFrame: (eased:number, raw:number)=>void, onDone: ()=>void): { cancel(): void }   // rAF driver, one per transition
captureFlightSource(sourceEl: HTMLElement): IFlightSource
// frame = sourceEl bounding rect; inner img found via query; parallax captured GEOMETRICALLY:
// imgRect vs frameRect → innerHeightPct = imgRect.height/frameRect.height*100,
// innerOffsetYPct = (imgRect.top-frameRect.top)/frameRect.height*100  (works for any transform mechanism);
// radius = parseFloat(getComputedStyle(sourceEl).borderRadius) || 0
computeSlideRect(slide: { pan: {x:number;y:number}; currZoomLevel: number; width: number; height: number }): IRect
// where the real pswp slide sits: { x: pan.x, y: pan.y, w: width*currZoomLevel, h: height*currZoomLevel }
interpolateFlight(from: IFlightSource, to: IFlightTarget, t: number): IFlightFrame   // pure lerp incl. inner un-parallax → 100%/0%
createFlightLayer(): { mount(frame: IFlightFrame, src: string): void; paint(f: IFlightFrame): void; unmount(): void }
// fixed-position div, overflow hidden, z-index above pswp root; inner <img> painted from innerHeightPct/OffsetYPct
```

- [ ] **Step 1: failing tests** — `interpolateFlight`: t=0 returns source values, t=1 returns target rect with radius→target.radius, inner 100%/0%; t=0.5 midpoints. `clock` (fake timers + rAF stub in node): calls onFrame with eased values, onDone once, `cancel()` stops frames. `captureFlightSource` (dom): fixture with frame 300×400 and inner img offset —assert pct math (happy-dom returns zeroed layout rects — set explicit `getBoundingClientRect` mocks on the two elements).
- [ ] **Step 2:** run → FAIL. **Step 3:** implement (port interpolation from the mockup's `applyFlight`, generalized to the geometric capture). **Step 4:** PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: transition clock, source capture and flight math"`

### Task 9: Transition engine — curtain + flight + hand-off

**Files:**
- Create: `src/ts/transition/{transitionEngine.ts,backdrop.ts}`
- Modify: `src/ts/core/createLightbox.ts`, `src/styles/` (add `_lightbox.scss` partial: backdrop, flight layer, chrome opacity var; include the Safari compositing fix from the spec's hazards list — `.pswp img { background: rgba(255,255,255,0.01); }` with a comment referencing upstream #1846)
- Test: playground verification (DOM/timing behavior is structurally untestable in happy-dom; math already covered)

**Interfaces:**
- Consumes: `CurtainMask`, `createClock`, `captureFlightSource`, `computeSlideRect`, `interpolateFlight`, `createFlightLayer`, `EASINGS`, pswp lifecycle events.
- Produces: `runOpenTransition(pswp, opts, req): Promise<void>`, `runCloseTransition(pswp, opts, req): Promise<void>` orchestrating:
  1. Open: pswp root visibility suppressed (`--arts-lightbox-reveal: 0` → slides+bg hidden via CSS); backdrop element inserted into pswp root, CurtainMask attached (curtain preset) or opacity-driven (fade preset); flight mounted from `captureFlightSource(req.sourceElement)`; on `firstZoomPan` read `computeSlideRect(pswp.currSlide)` as flight target; one clock drives `mask.setProgress(t, bellBow(t, bow))` + `flight.paint(interpolateFlight(...))` + chrome opacity `clamp01((t-0.65)/0.35)`; on done: reveal real slide, unmount flight next frame.
  2. Close: re-measure nearest visible element for the slide key (`gallery.elementsByKey`); `through` → `mask.setDirection('top')` at t=1 (seamless per CM contract) then drive t 1→0 with `-bellBow`; missing/off-screen source → backdrop-only (no flight).
  3. `slideChange: 'fade'` → suppress mainScroll animation (`moveIndexBy(diff, false)` via our nav calls) + crossfade slide containers with a short clock (250 ms, same easing family).
- [ ] **Step 1: implement + wire into open/close paths (close intercepts the `close` event trigger: our UI/Esc call `engine.close()` which runs the transition first, then `pswp.close()` with animation type none).**
- [ ] **Step 2: playground verification checklist (each item must visibly pass at `localhost:5201`):** curtain sweeps up swallowing page, clicked image flies above it un-doing radius; close reverse returns it to source; close `through` (flip default in console) exits upward; fade preset works; open from a programmatically scrolled position lands correctly; clicking a clone in the (Task 14) list flies from that clone.
- [ ] **Step 3: run full gates** — `pnpm typecheck && pnpm test && pnpm lint`.
- [ ] **Step 4: Commit** — `git commit -m "feat: curtain and flight open/close transitions with slide hand-off"`

### Task 10: Explore mode + zoom ergonomics

**Files:**
- Create: `src/ts/interaction/{mapPointerToPan.ts,exploreMode.ts}`
- Test: `tests/interaction/mapPointerToPan.test.ts`

**Interfaces:**
- Consumes: pswp `zoomPanUpdate` event, `slide.bounds {min,max}`, `slide.panTo`, `slide.currZoomLevel`, `slide.zoomLevels.fit`, `opts.explore`.
- Produces:
```ts
mapPointerToPan(pointer01: {x:number;y:number}, bounds: {min:{x:number;y:number}; max:{x:number;y:number}}): {x:number;y:number}
// linear map: axis value = max + (min - max) * pointer01[axis]   (pswp naming: max = left/top-most translate)
createExploreMode(getPswp: () => PhotoSwipe | null, opts: IOptions): { enable(): void; disable(): void }
// pointer-fine only (matchMedia '(pointer: fine)'); active while currZoomLevel > zoomLevels.fit + epsilon;
// mousemove (on pswp root) stores target pan; rAF loop lerps current→target by opts.explore.smoothing and
// calls slide.panTo; loop stops when idle (delta < 0.5px); drag-pan still wins while pointer is down
```
- [ ] **Step 1: failing test for `mapPointerToPan`** — pointer 0/0 → `{x: max.x, y: max.y}`; 1/1 → min; 0.5 → midpoint; degenerate bounds (min===max, image fits) → constant.
- [ ] **Step 2:** FAIL. **Step 3:** implement both files; wire into engine when `opts.explore.enabled`. **Step 4:** PASS + playground check: click-zoom in, mouse glides the pan; wheel zoom with `wheelToZoom: true`; `imageClickAction: 'next'` advances.
- [ ] **Step 5: Commit** — `git commit -m "feat: mousemove explore pan with lerp smoothing"`

### Task 11: UI layer

**Files:**
- Create: `src/ts/ui/{registerUi.ts,arrows.ts,counter.ts,caption.ts,closeButton.ts,thumbnailsStrip.ts,downloadButton.ts,slideshow.ts}`, `src/styles/_ui.scss`
- Test: `tests/ui/slideshow.test.ts` (timer logic, fake timers), playground for the rest

**Interfaces:**
- Consumes: `pswp.on('uiRegister')` + `pswp.ui.registerElement({name, html, isButton, onClick, onInit, appendTo, order})`, `ISlideData` (captions/thumbs), `opts.ui`/`opts.slideshow`/`opts.gallery.passThrough`, `neighborGallery(current, galleries, dir)` from Task 6 (arrow/keyboard `next` at the last slide with passThrough on → reopen at neighbor gallery's first slide instead of looping; `prev` at index 0 mirrors it).
- Produces: `registerUi(pswp, gallery, opts)` installing: prev/next arrows (with `data-arts-cursor-follower-target='{"magnetic":true}'` attributes — inert without cursor-follower), counter, caption (from slide data, bottom-left), close; thumbnails strip (`appendTo:'root'`, bottom, one `<button><img msrc></button>` per slide, click → `pswp.goTo(i)`, active class synced on `change`, hidden below 768px via CSS, drag-scrollable via native overflow); download button (anchor `href=slide.src` + `download` attr); slideshow module: `createSlideshow(pswp, interval)` → `{toggle,stop}`, `setInterval`-driven `pswp.next()`, any `pointerdown`/`wheel`/key stops it, play/pause button reflects state. All chrome opacity rides the transition clock's CSS var. Guard every handler with `if (pswp.isDestroying) { return }`.
- [ ] **Step 1: failing slideshow test** (fake timers: advances on interval, stops on interaction event, toggle restarts). **Step 2:** FAIL. **Step 3:** implement all elements. **Step 4:** PASS + playground checklist: arrows/counter/caption/close render and work, thumbs jump + sync, download saves, slideshow advances and pauses on interaction.
- [ ] **Step 5: Commit** — `git commit -m "feat: custom UI layer with thumbnails, download and slideshow"`

### Task 12: Video + HTML content modules

**Files:**
- Create: `src/ts/content/{videoContent.ts,htmlContent.ts,registerContent.ts}`
- Modify: `src/ts/core/mapToPswpOptions.ts` (pass type/videoSrc/html through dataSource)
- Test: `tests/content/videoContent.dom.test.ts`

**Interfaces:**
- Consumes: pswp events `contentLoad` (preventable — build our element), `contentActivate`/`contentDeactivate` (play/pause), `contentResize` (preventable — aspect-fit sizing), `contentDestroy`; filter `isContentZoomable` (→ false for video/html).
- Produces: `registerContent(pswp, opts)` wiring both modules. `videoContent`: self-hosted → `<video controls playsinline>`; embeds → YT (`youtube-nocookie.com/embed/<id>?enablejsapi=1`) / Vimeo iframe; activate → play (self-hosted `.play()`, embeds via postMessage), deactivate → pause; `contentResize` → contain-fit box from slide data aspect (fallback 16:9). `htmlContent`: clones the node referenced by `data-arts-lightbox-html` selector.
- [ ] **Step 1: failing dom test** — `videoContent` element factory: `.mp4` data → `<video>` with src; YT URL → iframe with nocookie embed URL + extracted id; aspect-fit math (given panArea 1000×800, aspect 16:9 → 1000×562.5).
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** PASS + playground: mixed gallery slides between image→video→html; video pauses when swiping away; flight transition for video/html opens degrade to backdrop-only (source has no image to fly — guard in transition engine: only `type:'image'` flies).
- [ ] **Step 5: Commit** — `git commit -m "feat: first-class video and html slides"`

### Task 13: Gate + boot entries

**Files:**
- Modify: `src/ts/gate.ts`, `src/ts/boot.ts`, `src/ts/global.d.ts`, `src/ts/constants/assetIds.ts` (new), `src/ts/index.ts`
- Test: `tests/gate.dom.test.ts`, `tests/boot.dom.test.ts` (adapt CF's equivalents)

**Interfaces:**
- Produces: `window.artsLightbox: { ready: Promise<ILightbox>; get(): ILightbox | null; version: string }`. Gate (separate bundle, no banner/sourcemap): double-install guard; sets `has-arts-lightbox`/`no-arts-lightbox` on `<html>` (from `window.artsBetterLightboxBoot.enabled`); capture-phase click listener on candidate selector → holds the event (`preventDefault`+`stopPropagation`), injects CSS `<link>` then engine `<script>` (ids from `assetIds.ts`), replays the open via `artsLightbox.ready.then(lb => lb.open(el))`; `pointerover` on a candidate pre-warms (inject without replay); engine-load failure → `window.location.assign(originalHref)` (spec's degrade path). Boot: claims gate's ready-resolver (CF pattern incl. no-gate fallback), `createLightbox(window.artsBetterLightboxOptions).init()`, dispatches `arts-lightbox:ready`.
- [ ] **Step 1: adapt CF's gate/boot dom tests to the new globals; add cases: held click replays after ready resolves; failed script `onerror` navigates to href. Run → FAIL.
- [ ] **Step 2:** implement gate/boot. **Step 3:** PASS. **Step 4:** `node build/index.js build` — assertRelease passes with both bundles.
- [ ] **Step 5: Commit** — `git commit -m "feat: pre-paint gate with click hold-replay and boot entry"`

### Task 14: Hard-case fixtures + contract page

**Files:**
- Create: `docs/demos/{parallax-cards.html,infinite-clones.html,mixed-content.html,groups-vs-united.html,tall-explore.html,stress-swipe.html}`, `docs/{transitions.md,gallery.md,content.md}`, `docs/developers.md`
- Modify: `docs/.vitepress/config.mts` (nav/sidebar)

**Interfaces:**
- Consumes: everything shipped; the fixtures ARE the spec's hard cases (spec §Playground-first workflow).
- Produces: fixture pages exercising: parallax+radius+overflow sources (inner img transformed, as in the brainstorm mockup); infinite list with 3× cloned nodes; mixed image/video/html; two groups + a `uniteAll` toggle demo; one tall image opened pre-zoomed with explore; 12-slide stress gallery. `docs/developers.md`: the public contract — discovery global, data-attribute vocabulary, `arts-lightbox:*` events, html classes (phase-2 PHP filters listed as "WordPress integration, upcoming").
- [ ] **Step 1: build fixtures (single-source pattern from Task 3), wire nav.**
- [ ] **Step 2: full manual pass of every fixture against the spec's behavior sections; fix what falls out.**
- [ ] **Step 3: Commit** — `git commit -m "docs: hard-case fixtures and public contract page"`

### Task 15: Quality gate + repo CLAUDE.md

**Files:**
- Create: `CLAUDE.md`
- Modify: whatever the gates flag

- [ ] **Step 1: run everything** — `pnpm typecheck && pnpm test:coverage && pnpm lint && pnpm knip && pnpm docs:build && node build/index.js build`. Fix all failures/dead exports.
- [ ] **Step 2: write `CLAUDE.md`**: what this is, commands, runtime architecture (gate→engine, one-clock transition rule, persistent-engine/fresh-pswp-per-open rule, allowPanToNext runtime fix + why no source patch, #2166 patch note), conventions (aliases, barrels, dom-test naming), and port the applicable "don't reintroduce" landmines from CF's CLAUDE.md.
- [ ] **Step 3: Commit** — `git commit -m "chore: quality gates green, project CLAUDE.md"`

## Verification (end-to-end)

1. `pnpm typecheck && pnpm test:coverage && pnpm lint && pnpm knip` — all green; coverage report generated.
2. `pnpm docs:dev` → walk all six fixture pages: curtain/flight open+close (both close directions, both presets, both edges), desktop mouse-drag swipe, explore glide, thumbnails/download/slideshow, video play/pause on slide change, clone-aware flight, unite-all.
3. `node build/index.js build` → `dist/better-lightbox-for-elementor.zip` staged with both JS bundles + CSS, versions stamped `0.1.0`.
4. Defer to phase 2 (noted, not verified here): PHP printing, Elementor Site Settings, kit parity, on-device iOS checks from the spec's hazards list.

## Explicit decisions baked in (flag if wrong)

- `photoswipe` pinned exact `5.4.4` in devDependencies (bundled; patched — caret would break the patch).
- Playground port 5201 (CF uses 5200; both may run simultaneously).
- Desktop drag fix is runtime (`beforeOpen` handler), not a source patch — research-verified single consumer reads options live.
- Only `type:'image'` slides fly; video/html open transitions are backdrop-only.
- `bgOpacity` handled by our backdrop element (pswp bg suppressed), exposed as `ui.backdropOpacity`.
