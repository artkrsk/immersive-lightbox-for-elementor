import type { IOptions } from '../interfaces'

/** Transition numbers were validated interactively during the design phase. */
export const DEFAULT_OPTIONS: IOptions = {
  transition: {
    preset: 'curtain',
    edge: 'curved',
    close: 'reverse',
    duration: 800,
    easing: 'power2.inOut',
    bow: 0.12
  },
  // On by default: it's an enhancement, only active while zoomed beyond fit
  // on pointer-fine devices, and drag-pan keeps working alongside it.
  explore: {
    enabled: true,
    smoothing: 0.12
  },
  // The signature open: slides appear already zoomed to cover (fill is also
  // the zoom ceiling), mousemove explores, click toggles out to fit.
  zoom: {
    imageClickAction: 'zoom',
    wheelToZoom: false,
    initialLevel: 'fill'
  },
  slideChange: 'slide',
  gallery: {
    uniteAll: false,
    passThrough: false,
    loop: true
  },
  ui: {
    thumbnails: false,
    download: false,
    counter: true,
    captions: true,
    backdropOpacity: 1,
    // Two independently mirrored chevrons rather than one flipped by CSS: a
    // theme replacing them supplies two unrelated glyphs, so the defaults
    // behave the way a replacement would. Close is composed in closeButton.ts
    // — baking its bars here would make constants/ import from ui/.
    icons: {
      prev: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
      next: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
      close: ''
    }
  },
  slideshow: {
    enabled: false,
    interval: 5000
  },
  prefetch: {
    onHover: true
  },
  video: {
    autoplay: true
  },
  desktopDrag: true
}
