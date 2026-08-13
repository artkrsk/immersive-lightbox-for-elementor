# Chrome Extension Surface & WordPress Wiring — Design

Date: 2026-08-13
Status: approved in brainstorm, pending implementation plans

## What this is

Two decisions that were being treated as one pile of feature requests:

1. **How a theme reaches this plugin's chrome** — so Velum can ship a split counter, split-text captions and its own icons without this repo growing a plugin framework or a GSAP dependency.
2. **How the WordPress plugin wires into Elementor** — so activation enhances and deactivation restores, with no database writes in either direction.

Supersedes nothing in `2026-08-12-better-lightbox-design.md`; extends its Behavior and
Elementor-integration sections.

## The constraint envelope

- **No backwards-compatibility obligations.** Velum is unreleased and has no lightbox wiring yet.
  Released themes (Trigger and older) will not be migrated. `ArtsCustomGallery` is prior art, never
  a migration target.
- **The real constraint is post-release version skew.** Once on WP.org this plugin auto-updates
  while themes update on their own cadence. Every combination of `lightbox N` × `theme M` must work
  forever, in both directions.
- Therefore: **additive-only from 1.0.** Event names, detail keys, class names and attribute names
  are never renamed or repurposed. New ones may be added. Consumers treat a missing key as an older
  plugin and ignore unknown keys as a newer one.
- Precedent: cursor-follower's contract already survives this same matrix with the same discipline.
  This one inherits its shape rather than inventing a second style.

## 1. The notification contract

Velum needs **notification and restyling, not registration**. `ArtsSplitCounter` does not want to be
mounted by us — it wants `setCurrent(n)` called when the index changes. That is an event, not a
plugin API. A renderer-registration API (`registerChrome(name, {mount, update, destroy})`) was
considered and rejected: it is far harder to keep additive than an event detail, it welds the
vendored PhotoSwipe fork's lifecycle into a public contract, and nothing has asked for chrome
elements that do not already exist.

Four channels. Each is a no-op when the other side is absent.

### Channel 1 — Events on `document`

```ts
'arts-lightbox:open'     // root in the DOM, chrome mounted, clock still at 0
'arts-lightbox:change'   // current index changed
'arts-lightbox:destroy'  // core torn down — release your instances
```

Detail is wire-level: primitives only, no engine objects, no class identity.

```ts
{
  root: HTMLElement   // the pswp root — the consumer's DOM anchor
  index: number       // 0-based
  total: number       // slides in the active gallery
  caption: string     // '' when none
  type: 'image' | 'video' | 'html'
}
```

`:destroy` carries `{ root }` only.

No `:close` event in 1.0. The close choreography already lowers the clock var, so a CSS-driven exit
is free, and adding an event later is non-breaking. If a scripted exit is wanted, it is added then.

A fresh pswp core is created per open (existing invariant), so consumers re-create their DOM on every
`:open` and release on `:destroy`. No persistence, no reuse.

### Channel 2 — The DOM anchor

- `root` arrives in the event detail, so there is no query race.
- `--arts-lightbox-chrome` is set on that root (`transition/setChrome.ts`) and **inherits**, so
  appended DOM rides the shared transition clock with one declaration:
  `opacity: var(--arts-lightbox-chrome, 1)`. Applying it is the consumer's choice; we only publish
  the value.
- Stock chrome class names become documented-stable: `.arts-lightbox-counter`, `-caption`, `-arrow`,
  `-close`, `-thumbs`.
- All chrome is absolutely positioned, so a replacement positions itself with its own CSS. No
  region or slot concept is introduced.

Known trade: replacement DOM is unmanaged. If our chrome layout changes, nothing warns the consumer.
Accepted for decorative elements that degrade to nothing.

### Channel 3 — State classes

Existing behavior promoted to contract, not new code:

- `<html>`: `has-arts-lightbox` / `no-arts-lightbox`
- root: `arts-lightbox-can-zoom`, `arts-lightbox-zoomed-in`, `arts-lightbox-transitioning`

### Channel 4 — Options, server-side

The `arts_better_lightbox/options` PHP filter (already planned for phase 2) is how a theme switches
stock pieces off so our updater does not fight a replacement. Phase 1 uses the options object passed
to `createLightbox`.

## 2. Stock chrome upgrades

Velum's `icon-blink`, `text-blink` and the burger button's closed-state hover are **one primitive**:
an `overflow: hidden` track holding a normal layer and a duplicate layer parked off-view; on hover
the normal layer exits and the duplicate slides in. All three are pure sass — no JS, no GSAP.

### The blink primitive

Velum enumerates eight directions as sass modifiers (~200 lines across two partials). Collapse to two
custom properties and four rules:

```scss
.arts-lightbox-blink__layer_normal { transform: translate(0, 0); }
.arts-lightbox-blink__layer_hover  {
  transform: translate(calc(var(--arts-lightbox-blink-x, 1) * -100%),
                       calc(var(--arts-lightbox-blink-y, 0) * -100%));
}
:hover > .arts-lightbox-blink > .arts-lightbox-blink__layer_normal {
  transform: translate(calc(var(--arts-lightbox-blink-x, 1) *  100%),
                       calc(var(--arts-lightbox-blink-y, 0) *  100%));
}
:hover > .arts-lightbox-blink > .arts-lightbox-blink__layer_hover { transform: translate(0, 0); }
```

Direction becomes data (`-1 | 0 | 1` per axis), themeable per element, and covers all eight
directions plus arbitrary diagonals. We duplicate the *same* icon (movement); Velum's
`_normal-scale` variant exists only for mismatched icon pairs we do not have.

Markup: `<button><span class="arts-lightbox-blink"><span …_normal>ICON</span><span …_hover>ICON</span></span></button>`.
The duplicate keeps the `aria-hidden="true"` the existing SVGs already carry — no new a11y work.

### Timing is the effect

Velum's burger is not a symmetric swap: the leaving fill slides out over `0.3s`, the arriving one
over `0.45s` — 1.5× slower, a chase rather than a swap — cascading across the glyph's parts at 75ms,
with the parked layer at `translateX(calc(-100% - 4px))` so the two fills never leave a sub-pixel
seam. That asymmetry is most of what reads as premium; a symmetric blink feels cheap. Exposed as
`--arts-lightbox-blink-duration-out` / `-in`, defaulting to those values.

### Close button — two bars, not an SVG X

The glyph is built from two rotated `<span>`s rather than an inline SVG path. A single path has
nothing for the stagger to cascade across, bars take the sliding-fill treatment natively, and two
rotated bars are exactly the form Velum's burger takes when opened — so the lightbox close and the
burger close read as one component.

`--arts-lightbox-close-size` sizes the box; `--arts-lightbox-close-line-thickness` is **deliberately
independent of it**. Velum wants the same component at a smaller size, and thickness derived from the
box would render thinner and break that read.

The magnetic half of that shared identity is cursor-follower's, not ours — see §4.

### Caption reveal

Fade-in-up on slide change via a state class toggled in the existing `change` handler, with
distance/duration/easing as custom properties.

**Structural requirement:** the reveal lives on an inner `.arts-lightbox-caption__inner`. The outer
element's `opacity` is already claimed by `--arts-lightbox-chrome`; two things animating one property
is a latent bug.

### Icons as options

`ui.icons.{prev,next,close}` as option strings. The fork already supports per-element SVG override by
option name (`pswp.options[name + 'SVG']`, `photoswipe/ui/ui-element.ts`). This closes the gap where a
theme can restyle a button but not swap its glyph — reachable through Channel 4, no DOM surgery.
Velum's chevrons are filled 16×24 paths; ours are stroked, so they genuinely differ.

## 3. Thumbnails

Upgrade of the existing `ui/thumbnailsStrip.ts`, not a rewrite.

- **`ui.thumbnailsPosition: 'bottom' | 'top' | 'left' | 'right'`**, orientation derived rather than
  configured separately. Orientation × side yields eight combinations of which half are nonsense, and
  every key is an Elementor kit control under the PHP/TS parity invariant.
- **Overlay, not inset.** The strip floats over the slide rather than shrinking PhotoSwipe's viewport;
  insetting would mean reaching into the fork's sizing math. Slides open zoomed to fill, so overlay
  reads correctly. Trade: a tall image sits behind the rail rather than beside it.
- **Native scrolling only** — `overflow` plus the existing `scrollIntoView`, which works on both axes.
  Fancybox's "modern"/"classic" variants are carousel-driven; we have no carousel engine and
  zero-dependencies means we would be writing one.
- **Sizing as custom properties**: `--arts-lightbox-thumb-width` / `-height` / `-gap`.
- `loading="lazy"` on thumb images. Thumbs reuse the page's already-decoded `msrc`, so there is no
  extra network cost in the common case.
- Existing touch-width hiding (`max-width: 767px`) is retained unchanged.
- **Slideshow progress indicator ships.** CSS-only: the slideshow module exposes its interval as a
  custom property and toggles a running class; a pseudo-element animates over that duration on the
  active thumbnail. No rAF, no per-frame writes. Invisible unless `slideshow.enabled`.

## 4. Cursor-follower integration

The wire contract already exists and is additive-only from 1.0. Nothing here asks that plugin to
change its contract — only to extend its own rules.

### Ownership

**Cursor-follower owns hints; this plugin owns state.** It already ships
`src/php/Elementor/LightboxControls.php`, adding Magnetic Navigation, Drag Hint and a drag Style
select to Elementor's *own* Lightbox tab, consumed in `Options::lightbox_scope()` as a `targetScopes`
entry with `scope: '.elementor-lightbox'`.

Consequences:

- **No `ui.cursorHints` option here.** It would duplicate an existing control on the wrong side of the
  boundary, with wording we would have to localize separately.
- **No runtime cursor session here.** Cursor-follower's rules are selector-based and
  order-prioritized (first match wins), so our existing state classes express the state declaratively:
  a `.arts-lightbox-zoomed-in` rule listed above a `.arts-lightbox-can-zoom` rule yields "Zoom out" /
  "Zoom in" with no JS coupling in either direction. The drag hint is a third rule, ordered against
  them — which also resolves the collision where zoom-in, zoom-out and drag-to-next all target the
  same pixels.
- **Remove the hardcoded `data-arts-cursor-follower-target` attributes** from `ui/arrows.ts` and
  `ui/closeButton.ts`. An attribute we write bypasses cursor-follower's controls entirely: the user
  cannot switch it off in Site Settings, and the wording cannot come from its translated defaults or
  its Text/Icon chooser. From its perspective our chrome is "markup you don't render", which is what
  the rules filter is for.

Our repo therefore owns **nothing new** here: stable chrome class names and state classes, both
already covered by Channel 2 and 3. The native `cursor: zoom-in` / `zoom-out` in
`_lightbox.scss:54-62` stays as the no-cursor-follower baseline, keyed off the same classes.

### Regression this fixes

`lightbox_scope()` is scoped to `.elementor-lightbox`. Once this plugin replaces the rendering, that
DOM never exists — so cursor-follower's **existing** Magnetic Navigation and Drag Hint settings
silently stop working on any site running both plugins, Hello theme included. The cursor-follower-side
work is a regression fix, not an enhancement.

Verification caveat: rules are a PHP channel, so hints will not appear in the phase-1 VitePress
playground unless the docs harness registers equivalent rules the way cursor-follower's own docs
engine does.

## 5. WordPress wiring

### No dual interface

`ArtsCustomGallery` shipped a `custom_gallery_lightbox_type` kit select (Default / PhotoSwipe) because
a theme shipped both engines. As a plugin, **activation is the switch**. A settings toggle would be a
second switch for the same thing, whose failure mode is a deactivated plugin with the toggle still set
to "ours".

### Never write to the user's data

Restore-on-deactivate must be a **property of the mechanism**, not an action we perform. Deactivation
hooks do not run when plugin files are deleted, and a failed hook would leave a site with no lightbox
at all.

### Capture-phase interception (already built)

`gate.ts` registers `document.addEventListener('click', onClick, { capture: true })` and calls
`preventDefault()` + `stopPropagation()`. Elementor's `LightboxManager.bindEvents()` uses
`elementorFrontend.elements.$document.on("click", "a, [data-elementor-lightbox]", …)` — a jQuery
*delegated* handler on `document`, bubble phase. A capture listener on `document` fires before the
event reaches the target, so stopping propagation there means it never reaches the target and never
bubbles back. Elementor's handler never runs.

Deactivate and the inline gate stops being printed; Elementor's binding was never touched. No
cleanup, no DB writes, no uninstall routine. (Verified against Elementor 4.2.2.)

### The Elementor adapter (the actual gap)

`CANDIDATE_SELECTOR` is currently `a[data-arts-lightbox], [data-arts-lightbox][data-arts-lightbox-type]`
— our own vocabulary only. Activating on Hello theme today would enhance nothing. The collector needs
to additionally recognize:

- `a[data-elementor-open-lightbox="yes"]` — the per-widget Default/Yes/No control and the global
  switch are already resolved server-side into this attribute
- `data-elementor-lightbox-slideshow="<id>"` — Elementor's grouping, mapped onto our group id
- `[data-elementor-lightbox]` — the JSON-payload variant
- `a[href^="#elementor-action"]` routing to `actions.lightbox` → `openSlideshow()` — a **second entry
  point**; needs an explicit adopt-or-pass-through decision rather than discovery as a bug
- WordPress's core Gallery widget renders through `wp_get_attachment_link`, bypassing Elementor's
  render pipeline entirely. `ArtsCustomGallery` needed a separate `wp_get_attachment_link` filter to
  reach those links; we inherit the same problem.

### The policy rule

**Elementor decides whether a link opens in a lightbox; we decide how.** We are a renderer swap, not a
policy change. Every existing per-widget and global setting keeps meaning exactly what it meant. Our
own vocabulary remains for non-Elementor markup and for concepts Elementor lacks (`-type`, `-html`,
`-off`).

### PHP composition — standalone

The phase-2 PHP layer does **not** compose from `arts/base` or `arts/utilities`. It stays
self-contained under `Arts\BetterLightbox\`, requiring only `php >=8.0`, following
`smooth-scrolling-for-elementor` (`Plugin.php`, `Options.php`, `Elementor/SiteSettingsTab.php`, empty
`vendor-prefixed/`) and `cursor-follower-for-elementor` — the two closest analogues in shape, both
standalone. Three other plugins in the directory do compose from framework packages; this one
deliberately does not.

### Kit settings

Reuse Elementor's existing lightbox controls rather than duplicating them, so a user's styling
survives activation: `lightbox_color`, `lightbox_ui_color`, `lightbox_ui_color_hover`,
`lightbox_text_color` gain `.pswp` selectors alongside the native `.elementor-lightbox` ones, and
`lightbox_enable_counter` drives our counter. Only genuinely new options become new controls.

**Share and fullscreen are dropped.** Elementor's `lightbox_enable_fullscreen` and
`lightbox_enable_share` have no equivalent in our engine and will not gain one — we render neither
button. Their kit controls are left alone rather than hidden: the values stay meaningful for
Elementor's own lightbox the moment this plugin is deactivated, and suppressing a control the user
may rely on later would be a policy change, which §5 rules out. Inert while we are active, live
again when we are not. No code required — the engine already renders neither.

Our own kit controls persist after deactivation as unknown controls, which Elementor ignores;
reactivating restores the user's config intact. This is desirable — no uninstall cleanup should
destroy it.

## Out of scope

- **Any URL control.** `ArtsEnhancedURLControl` is almost entirely generic: a whole-package grep for
  `lightbox|Gallery|pswp|photoswipe` returns one hit, a hardcoded `'lightbox'` string in an allowlist
  at `Render.php:76`. The lightbox behavior is ~20 lines of *config* in `ArtsCustomGallery`. Meanwhile
  Elementor's own `open_lightbox` covers Image / Gallery / Carousel / Media Carousel, stock
  `custom_attributes` covers arbitrary links, and `data-arts-lightbox` covers non-Elementor markup.
  The residual gap — a Button or text link opening a lightbox — is niche and already solvable via a
  documented `custom_attributes` recipe. If demand appears later, the shape is a curated additive
  `SWITCHER` following cursor-follower's `WidgetControls.php` precedent, never a control-type swap.
- **A renderer-registration JS API.** See §1.
- **Carousel-driven thumbnail variants.** See §3.
- **Migration of ArtsCustomGallery consumers.** See constraint envelope.

## Verification

- Blink, caption reveal and thumbnail positions are CSS — verified in the playground at
  `localhost:5201`, the only place transitions and gestures are truly verified.
- Capture-phase interception and the Elementor adapter need a real WordPress install; the playground
  cannot exercise them.
- Cursor-follower hints need both plugins active on WordPress, per the caveat in §4.
- The notification contract is testable in `*.dom.test.ts` suites: dispatch order, detail shape, and
  no-op behavior when no listener exists.
