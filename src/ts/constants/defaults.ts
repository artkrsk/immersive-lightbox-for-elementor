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
  explore: {
    enabled: false,
    smoothing: 0.12
  },
  zoom: {
    imageClickAction: 'zoom',
    wheelToZoom: false
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
  desktopDrag: true
}
