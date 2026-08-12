import type { IGallery } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe.js'

const DOWNLOAD_SVG =
  '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 4v10m0 0l-4-4m4 4l4-4M5 19h14" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'

/**
 * Direct download of the full-size file — the reliable answer to mobile
 * long-press-save being broken by touch handling (upstream #1216).
 */
export function registerDownloadButton(pswp: PhotoSwipe, gallery: IGallery): void {
  pswp.ui?.registerElement({
    name: 'arts-download',
    className: 'arts-lightbox-download',
    order: 15,
    isButton: true,
    tagName: 'a',
    appendTo: 'bar',
    html: DOWNLOAD_SVG,
    onInit: (el) => {
      const anchor = el as HTMLAnchorElement
      anchor.setAttribute('download', '')
      anchor.setAttribute('rel', 'noopener')
      const update = (): void => {
        anchor.href = gallery.slides[pswp.currIndex]?.src ?? ''
      }
      update()
      pswp.on('change', update)
    }
  })
}
