# Developers

The public contract, additive-only once released. Elementor control IDs and
everything not listed here are internal.

## Discovery global

`window.artsLightbox` exists from parse time (the gate installs it) with a
pending `ready` promise:

```ts
interface IArtsLightboxGlobal {
  /** Resolves once the engine initializes. */
  ready: Promise<ILightbox>
  get(): ILightbox | null
  version: string
  /** Re-scan for candidate links and re-stamp `arts-lightbox-link`. */
  refresh(): void
}

interface ILightbox {
  init(): void
  destroy(): void
  /** Runs the close choreography; resolves once the lightbox is gone. */
  close(): Promise<void>
  /** Opens the lightbox for a candidate element; false if it resolved to nothing. */
  open(el: HTMLElement): boolean
  readonly version: string
}
```

`document` also receives a bubbling `arts-lightbox:ready` CustomEvent
(detail = the instance) once the engine is live.

`refresh()` re-scans for candidate links: every one in the current DOM
carries the marker class again afterward (and a present cursor follower is
nudged to re-resolve the hover it may be holding). Arts AJAX transitions need
no call — the plugin rides the `DOMContentLoaded` those themes re-dispatch
after every transition. Neither does anything Elementor renders — the editor
canvas rebuilding a widget, a popup opening, load-more appending posts — since
the plugin subscribes to Elementor's own per-element ready hook. The manual
call is for any other AJAX navigation.

`close()` is the other half of that, and no theme gets it for free: an open
lightbox knows nothing about a page transition, so a router that swaps the DOM
underneath one leaves it floating over the incoming page. Call `close()` before
the swap. It resolves once the lightbox is actually gone, so a router that
collects promises can hold its leave until the close lands:

```js
// Arts AJAX transitions
document.addEventListener('arts/ajax/transition/willStart', (e) => {
  e.detail.waitPromises.push(window.artsLightbox.get().close())
})
```

Safe to call blind — it resolves immediately when nothing is open, joins the
close already running if one is, and waits out an open choreography still in
flight rather than dropping the request. `destroy()` is not a substitute: it
also disarms the delegated click handling for the rest of the JS context, which
on an AJAX site means no lightbox again until `init()`.

## HTML state classes

Exactly one is always present on `<html>` after the gate runs:

- `has-arts-lightbox` — engine armed for this request
- `no-arts-lightbox` — disabled (kill switch, missing boot data)

## Data-attribute vocabulary

| Attribute | On | Meaning |
| --- | --- | --- |
| `data-arts-lightbox` | `<a href="full-size">` | Opt this link into the lightbox |
| `data-arts-lightbox-group="id"` | link or ancestor | Group galleries across containers |
| `data-arts-lightbox-id="id"` | link | Canonical identity for clone dedup (defaults to the normalized href) |
| `data-arts-lightbox-type="image\|video\|html"` | link | Override type detection |
| `data-arts-lightbox-caption="…"` | link | Caption title line (falls back to `<figcaption>`, then the thumb's `alt`) |
| `data-arts-lightbox-description="…"` | link | Caption description line — explicit only, no DOM fallback |
| `data-arts-lightbox-html="#selector"` | link | Content source for html slides |
| `data-arts-lightbox-width` / `-height` | link | Full-size dimensions (fall back to the thumb's attributes) |
| `data-arts-lightbox-thumb="url"` | link | The strip / placeholder thumbnail for a trigger that wraps no media (a text link); wins over a contained `<img>` / `<video poster>`; a wrapped poster-less `<video>` falls back to a frame captured at open time |
| `data-arts-lightbox-off` | link or ancestor | Opt out (wins over everything) |
| `data-arts-lightbox-clone` | link or ancestor | Marks a duplicated instance: it joins the slide's DOM instances but never sets its position |

Video links need no attributes at all — YouTube/Vimeo URLs and video file
extensions are detected from the href.

### Opening an arbitrary link

Any Elementor element with a link accepts custom attributes (Advanced →
Attributes), and the vocabulary above reaches the engine that way — one
`key|value` per line:

```
data-arts-lightbox
data-arts-lightbox-caption|Behind the scenes
```

The bare opt-in needs no recipe: every URL control carries an "Open in
lightbox" checkbox (see [The URL control](#the-url-control)). Reach for
custom attributes when you need more than the opt-in — a caption override,
a type override, a group id.

## Theme integration

The wire a theme builds against to replace stock chrome with its own. The
skew rules are absolute: once on WP.org this plugin auto-updates while themes
update on their own cadence, so every version pairing has to keep working.
Names here are never renamed or repurposed, new capabilities only ever add
names, and unknown keys in any payload are ignored. Feature-detect by
presence, never by version.

### Events

Three `CustomEvent`s on `document` — notification, not an API; a theme
registers nothing with the engine:

| Event | Fires when | Detail |
| --- | --- | --- |
| `arts-lightbox:open` | root in the DOM, chrome mounted, clock at 0 | `{ root, index, total, caption, description, type }` |
| `arts-lightbox:change` | the destination changed — at commit, before the slide lands | same shape, plus `{ previousIndex, direction }` |
| `arts-lightbox:destroy` | core being torn down — release your instances | `{ root }` |

Detail is primitives plus the root element: `index`/`total` are numbers,
`caption` and `description` are strings (empty when the slide has none), `type` is
`'image' | 'video' | 'html'`. No engine objects cross this wire.

- The init-time slide change is silent — `open` already carries the index.
- `change` fires when a navigation is committed (arrow, key, drag release,
  thumbnail), not when the strip comes to rest — the same moment the stock
  arrows, caption and thumbnails move. `index` is the destination, and a
  committed navigation is never undone, so chrome can animate with the slide
  instead of after it.
- `previousIndex` is the index the previous event announced. `direction` is
  `1 | -1` — the way the strip travelled, not the sign of the index delta: a
  loop wrap goes the short way round, so next from the last slide reports
  `direction: 1` with `index: 0`. Two slides wrap as an index jump the other
  way (the wrap cannot be painted forward) and report that way.
- `root` is still in the DOM when `destroy` fires.
- There is deliberately no `:close` event: the close choreography lowers
  `--arts-lightbox-chrome`, so a CSS exit rides it for free.

### DOM anchor and the transition clock

`detail.root` is the lightbox root. Mount theme chrome inside it, and read
`--arts-lightbox-chrome` — a `0→1` custom property on that root carrying the
open/close choreography — to fade on the same clock as everything stock:

```css
.my-counter {
  opacity: var(--arts-lightbox-chrome, 1);
}
```

On touch, a single tap on the slide area toggles the whole UI — stock
PhotoSwipe behavior, expressed as `pswp--ui-visible` on the root (present
while the chrome shows, absent while a tap has it hidden). All plugin chrome
keys on it; theme chrome mounted in the root can do the same, or multiply the
plugin's own fading factor into an opacity:

```css
.my-counter {
  opacity: calc(var(--arts-lightbox-chrome, 1) * var(--arts-lightbox-ui-visible, 1));
}
```

`--arts-lightbox-ui-visible` is a registered `1→0` property that transitions
on the root when the tap flips the class — read-only, like the clock.

### The bar

`.arts-lightbox-bar` inside the root is the top row: the close button's
home, already pushed below the WordPress admin bar, hidden and shown with
the rest of the UI on a tap. Mount a counter there rather than positioning
one against the root — the row's geometry is the plugin's to keep, and it
stays valid without a line of theme CSS. Children receive pointer events;
passive chrome sets `pointer-events: none` so a click beside it still
reaches the backdrop.

Chrome that is mounted on the root and pinned to the viewport top reads the
offset itself:

| Property | Value | Meaning |
| --- | --- | --- |
| `--arts-lightbox-admin-bar` | `px`, `0px` without a bar | the admin bar's height, stamped on the root per open and on resize |

Read-only — the plugin sets it, a theme only consumes it.

### Sizing the chrome

Geometry is set through custom properties on the lightbox root, not by
restyling the buttons. Every width is applied with `!important` — Elementor's
Site Settings print unlayered `.elementor-kit-N button { … }` rules that would
otherwise resize our chrome — and because our stylesheet lives in the
`arts-lightbox` cascade layer, a layered `!important` outranks an unlayered
one. So a theme rule setting `width` on `.arts-lightbox-arrow` cannot win, at
any specificity. Set the property instead:

```css
/* one place, no !important needed */
.pswp {
  --arts-lightbox-arrow-size: 72px;
  --arts-lightbox-close-size: 48px;
}
```

| Property | Default | Sizes |
| --- | --- | --- |
| `--arts-lightbox-inset-x` | `24px`, `16px` at `≤767px` | viewport edge to the chrome, horizontally |
| `--arts-lightbox-inset-y` | `24px`, `16px` at `≤767px` | viewport edge to the chrome, vertically |
| `--arts-lightbox-arrow-size` | `56px` | prev/next buttons (square) |
| `--arts-lightbox-close-size` | `56px` | close button (square) |
| `--arts-lightbox-close-line-thickness` | `2px` | its two bars — deliberately not derived from the size |
| `--arts-lightbox-thumb-size` | `56px` | one thumbnail (square) |
| `--arts-lightbox-thumb-gap` | `8px` | between thumbnails |
| `--arts-lightbox-thumbs-size` | `72px` | how far the arrows and caption step in from the inset for a rail |

Set them anywhere that inherits down to the lightbox — `:root` and `.pswp`
both work. None of them is declared by the plugin at all: the defaults above
live in the `var()` fallback at each use, because a value declared on an
element beats an inherited one and would quietly defeat a `:root` override.
The insets are the one nuance: their defaults change with the viewport, so
the plugin resolves each into a private property on `.pswp` — still as a
`var()` of the public one, so a `:root` override reaches both widths.

The insets draw one line per edge, and everything visible sits on it: the
arrows' and the close button's icon box, the counter's text, the caption's
text, the thumbnail tiles. A button's box is larger than its icon, so it
overhangs the line outward — hit area, not ink. The icon box is assumed to be
24px: custom `icons.prev` / `icons.next` markup should keep a 24px box (the
defaults are `viewBox="0 0 24 24"` at `width="24" height="24"`) to stay on the
line.

A rail's tiles sit on the inset line of the edge it claims; the arrows and the
caption then step in from that line by `--arts-lightbox-thumbs-size`.

Anything *without* `!important` needs no property: the cascade layer means
plain unlayered theme CSS already wins at any specificity.

### Stable class names

State classes on the root, for CSS and for rule scopes (cursor plugins
included):

| Class | Meaning |
| --- | --- |
| `arts-lightbox-transitioning` | open/close choreography running |
| `arts-lightbox-can-zoom` | the current slide can zoom |
| `arts-lightbox-zoomed-in` | zoomed beyond fit |
| `arts-lightbox-has-thumbs_left` (`_right` / `_top` / `_bottom`) | a thumbnail rail claims that edge |

And one class on the page rather than in the lightbox:
`arts-lightbox-link` is stamped on every candidate link while the plugin owns
clicks — style it, or key cursor-plugin rules on it. Stamped at DOM-ready,
after every Elementor element render, and on every `artsLightbox.refresh()`;
never stamped while the plugin is disabled, and `data-arts-lightbox-off` keeps
meaning never.

Stock chrome roots (sub-elements keep BEM names under these):
`arts-lightbox-bar`, `arts-lightbox-backdrop`, `arts-lightbox-arrow` (`_prev`/`_next`),
`arts-lightbox-close`, `arts-lightbox-counter`, `arts-lightbox-caption` (`__item`, `__title`, `__description`),
`arts-lightbox-thumbs` (`__item`, `__item_active`),
and `arts-lightbox-flight` — the travelling image during transitions.

### What the open stamps on the root

Two attributes go onto the lightbox root while it is open, both belonging to
other plugins rather than to us. Neither needs anything installed to be safe —
an attribute nobody reads means nothing.

| Attribute | Read by | Effect |
| --- | --- | --- |
| `data-lenis-prevent` | Lenis and its family | the smooth-scroll engine releases the overlay, so the lightbox scrolls natively |
| `data-arts-header-hide-over="in-view"` | Arts Header for Elementor | the site header hides for as long as the lightbox is up |

The header one is that plugin's own zone vocabulary, used rather than its JS
API on purpose: its engine watches the body subtree for the attribute, so a
root appended after boot is picked up with nothing imported and nothing to
tear down. It is removed on close **while the root is still in the document**
— that observer only sees mutations inside the body, so releasing after
detachment would leave the zone live until the next scroll.

Releasing does not force the bar back. That plugin tracks its hide flag
separately from its directional auto-hide, so the header returns to whatever
the scroll direction had it doing.

### Switching stock pieces off

A theme that drives its own counter or captions turns the stock ones off via
the `arts_immersive_lightbox/options` PHP filter (phase 2, below) — e.g.
`ui.counter: false`, `ui.captions: false`. Unknown keys are ignored, so a
theme may set options newer than the installed plugin without breaking.

## Types

```ts
import type {
  ILightbox,
  ILightboxChangeDetail,
  ILightboxEventDetail,
  IOptions,
  TDeepPartial
} from '@arts/immersive-lightbox'
```

The four `document` events are declared on `DocumentEventMap`, so
`document.addEventListener('arts-lightbox:change', (e) => e.detail.direction)`
types without a cast.

## WordPress integration

The plugin replaces Elementor's native lightbox by claiming eligible clicks
in capture phase — nothing server-side is suppressed or rewritten, so
deactivating (or filtering `enabled` off) restores the native lightbox
untouched. The governing rule: **Elementor decides whether a link opens in
a lightbox, we decide how.**

### Filters

| Filter | Effect |
| --- | --- |
| `arts_immersive_lightbox/enabled` | Return `false` to disable for a request: the gate never prints, `<html>` gets `no-arts-lightbox`, Elementor's native lightbox runs. |
| `arts_immersive_lightbox/options` | The assembled options payload (a deep-partial of `IOptions`) right before printing. |

### Recognized Elementor markup

Read-only for us; our `data-arts-lightbox-*` vocabulary always wins when
both are present on an element.

| Markup | Meaning |
| --- | --- |
| `a[data-elementor-open-lightbox="yes"]` | Stamped by every native widget; `"no"` always refuses |
| bare `<a href="…​.jpg">` | Eligible only while the kit's Image Lightbox switch is on (Elementor's own client-side rule, replicated: anchored extension regex, no `download`) |
| `[data-elementor-lightbox]` (JSON) | The Video widget's overlay payload — parsed, not re-derived |
| `data-elementor-lightbox-video` | Pro Media Carousel video slides: this is the source, the href is only the poster |
| `data-elementor-lightbox-slideshow` | Group id (below our own group attribute) |
| `data-elementor-lightbox-title` / `-description` | The two caption lines, as native shows them: the title sits between our attribute and `figcaption` in the title tiers; the description is its own line |
| `data-e-action-hash` / `#elementor-action` hrefs | Lightbox action deep links: clicks and `location.hash` on load both open; other actions (popup, scroll-to) pass through untouched |

### Elementor Site Settings

The existing Lightbox section drives the engine: the counter switch maps to
`ui.counter`, and the four color pickers write the engine's custom
properties — Background Color to `--arts-lightbox-backdrop-color`, UI Color
to `--arts-lightbox-ui-color`, UI Hover Color to
`--arts-lightbox-ui-hover-color`, Text Color to
`--arts-lightbox-caption-color`. The last two fall back through the UI
color, so a kit that sets only that one looks unchanged. Title, Description
and Counter Typography print as kit CSS against `.arts-lightbox-caption__title`,
`.arts-lightbox-caption__description` and `.arts-lightbox-counter` directly —
the layered defaults yield to anything the kit sets. Controls that only configure the native chrome (fullscreen,
zoom, share, icon sizes) hide while the plugin is enabled and reappear,
values intact, when it is not.

When Arts Cursor Follower is present, its Cursor Effects section (same
Lightbox tab) gains a second group: Hover Hint draws a magnifying glass, the
two-bar plus, or a text pill in the cursor over every `arts-lightbox-link` on
the page (None
falls back to the follower's regular link highlight), and Hint Text overrides
the pill's wording — printed as `--arts-lightbox-cursor-label` kit CSS, so it
edits live. The pill's typography and colors come from the follower's own
Hints controls.

The Title and Description selects choose which attachment field Elementor
stamps onto the link, so they reach the caption through
`data-elementor-lightbox-title` / `-description` like any other Elementor
media. A bare image link claimed by the fallback carries no attachment
context — nothing stamps those attributes — so its caption comes from the
DOM tiers above (`data-arts-lightbox-caption`, `<figcaption>`, `alt`)
regardless of what the selects say.

### The URL control

Every Elementor URL control gains an "Open in lightbox" checkbox that
stamps `data-arts-lightbox` on the rendered anchor — any widget's link can
opt in without the custom-attributes recipe above.

The checkbox only ever augments an anchor the widget already rendered: it
matches by the URL you typed, so an empty URL has nothing to match and
nothing is stamped.

While it is ticked, the editor pins a small **Lightbox** badge beside the
control's label. The options popover is usually shut, so without it nothing
on screen would say the link opens in a lightbox. It is sized to the label's
own line box, so showing and hiding it shifts nothing.

#### `arts_lightbox_fallback`

A widget that owns a picture — the image *is* the content, the link is
incidental — can say so, and let an empty URL mean "open me":

```php
$this->add_control( 'link', array(
    'type'                   => \Elementor\Controls_Manager::URL,
    'arts_lightbox_fallback' => 'image',   // sibling MEDIA control
) );
```

The value is the name of a sibling control holding the media. It changes
nothing on the front end — resolving an empty URL to that media, and
stamping the lightbox attributes, stays the widget's job in `render()`,
because only the widget knows which size to open and what caption to carry.

What the plugin contributes is the editor half: while the checkbox is
ticked and the URL is empty, the field's placeholder becomes `…/photo.jpg`,
naming the file that will actually open — the badge says what happens, this
says what opens. With the checkbox clear the placeholder reverts, since an
empty URL then means no link at all. A long name is left to the field to
clip; it only has to be recognisable.

Unknown to an older plugin, the key is ignored and the field keeps
Elementor's stock placeholder — the behaviour a theme implements in
`render()` is unaffected either way.
