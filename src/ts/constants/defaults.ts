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
    backdropOpacity: 1
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
