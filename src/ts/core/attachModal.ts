import type PhotoSwipe from '../photoswipe/photoswipe'

/**
 * Makes the open lightbox modal for the keyboard and assistive technology.
 * The page behind goes inert, so Tab cannot land on it and scroll it. So does
 * every slide but the current one: an off-screen neighbour's video controls
 * would otherwise sit in the Tab order. A CloseWatcher routes Escape through
 * `close`, because Chrome's native video controls swallow the keydown.
 */
export function attachModal(pswp: PhotoSwipe, close: () => void): void {
  let inerted: HTMLElement[] = []
  let watcher: { destroy(): void } | null = null

  pswp.on('firstUpdate', () => {
    const root = pswp.element
    if (!root) {
      return
    }
    root.setAttribute('aria-modal', 'true')
    // shortcut: a body child appended while open (a late chat widget) stays
    // reachable; watching for one needs an observer, add it if a case shows up.
    for (const el of document.body.children) {
      if (el instanceof HTMLElement && !el.inert && !el.contains(root)) {
        el.inert = true
        inerted.push(el)
      }
    }
    // Typed here, not in global.d.ts: TypeScript's DOM lib lacks it, and
    // themes compiling this source never see our ambient declarations.
    const Watcher = (
      window as { CloseWatcher?: new () => { onclose: (() => void) | null; destroy(): void } }
    ).CloseWatcher
    if (Watcher) {
      const closeWatcher = new Watcher()
      closeWatcher.onclose = close
      watcher = closeWatcher
    }
  })

  // Holder 1 is always the current slide; the others rotate through it.
  pswp.on('change', () => {
    pswp.mainScroll.itemHolders.forEach((holder, i) => {
      holder.el.inert = i !== 1
    })
  })

  pswp.on('destroy', () => {
    for (const el of inerted) {
      el.inert = false
    }
    inerted = []
    watcher?.destroy()
    watcher = null
  })
}
