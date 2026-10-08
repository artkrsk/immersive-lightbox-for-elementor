/** WordPress owns integration listeners independently of the browser gate. */
export function attachRefreshHooks(signal: AbortSignal): () => void {
  let pending = 0
  let hooks: NonNullable<typeof window.elementorFrontend>['hooks'] | undefined
  let woo: ReturnType<NonNullable<typeof window.jQuery>> | undefined
  const remark = (): void => {
    if (signal.aborted || pending) {
      return
    }
    pending = requestAnimationFrame(() => {
      pending = 0
      if (!signal.aborted) {
        window.artsLightbox?.refresh()
      }
    })
  }
  const subscribe = (): void => {
    if (signal.aborted || hooks) {
      return
    }
    hooks = window.elementorFrontend?.hooks
    hooks?.addAction('frontend/element_ready/global', remark)
  }
  const subscribeWoo = (): void => {
    if (signal.aborted || woo) {
      return
    }
    woo = window.jQuery?.(document)
    woo?.on('wc-product-gallery-after-init.artsLightbox', '.woocommerce-product-gallery', remark)
  }
  const dispose = (): void => {
    if (pending) {
      cancelAnimationFrame(pending)
      pending = 0
    }
    hooks?.removeAction?.('frontend/element_ready/global', remark)
    woo?.off?.('wc-product-gallery-after-init.artsLightbox', '.woocommerce-product-gallery', remark)
    window.removeEventListener('elementor/frontend/init', subscribe)
    document.removeEventListener('DOMContentLoaded', subscribeWoo)
    signal.removeEventListener('abort', dispose)
  }
  if (signal.aborted) {
    return dispose
  }
  signal.addEventListener('abort', dispose, { once: true })
  if (window.elementorFrontend?.hooks) {
    subscribe()
  } else {
    window.addEventListener('elementor/frontend/init', subscribe)
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', subscribeWoo, { once: true })
  } else {
    subscribeWoo()
  }
  return dispose
}
