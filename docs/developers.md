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
}

interface ILightbox {
  init(): void
  destroy(): void
  /** Opens the lightbox for a candidate element; false if it resolved to nothing. */
  open(el: HTMLElement): boolean
  readonly version: string
}
```

`document` also receives a bubbling `arts-lightbox:ready` CustomEvent
(detail = the instance) once the engine is live.

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
| `data-arts-lightbox-caption="…"` | link | Caption (falls back to `<figcaption>`, then the thumb's `alt`) |
| `data-arts-lightbox-html="#selector"` | link | Content source for html slides |
| `data-arts-lightbox-width` / `-height` | link | Full-size dimensions (fall back to the thumb's attributes) |
| `data-arts-lightbox-off` | link or ancestor | Opt out (wins over everything) |

Video links need no attributes at all — YouTube/Vimeo URLs and video file
extensions are detected from the href.

## Types

```ts
import type { ILightbox, IOptions, TDeepPartial } from '@arts/better-lightbox'
```

## WordPress integration (phase 2, upcoming)

The PHP side — `arts_better_lightbox/enabled` and
`arts_better_lightbox/options` filters, Elementor Site Settings, native
lightbox replacement — ships with the WordPress integration phase and will be
documented here when it lands.
