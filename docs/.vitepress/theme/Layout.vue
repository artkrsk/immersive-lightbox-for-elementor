<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import { useData } from 'vitepress'
import { onMounted, watch } from 'vue'
import { createLightbox } from '@engine'
import type { ILightbox, IOptions, TDeepPartial } from '@engine'

const { Layout } = DefaultTheme
const { frontmatter } = useData()

// The docs boot the engine the way the WordPress plugin does — a discovery
// global in the documented shape — so every example on these pages (and the
// reader's own console) speaks the documented contract. Not a reuse of
// boot.ts: that entry is WordPress-specific (options global, esbuild-injected
// version). Layout.vue is the persistent SPA root, so this runs once per full
// page load and the engine survives client-side navigation.
onMounted(() => {
  let instance: ILightbox | null = null
  const boot = (options?: TDeepPartial<IOptions>): void => {
    instance?.destroy()
    instance = createLightbox(options)
    instance.init()
  }

  if (!window.artsLightbox) {
    let resolveReady!: (lightbox: ILightbox) => void
    const ready = new Promise<ILightbox>((resolve) => {
      resolveReady = resolve
    })
    window.artsLightbox = { ready, get: () => instance, version: 'docs' }
    // Playground-only helper: flip options live from the console, e.g.
    //   artsLightboxPlayground.reboot({ transition: { close: 'through' } })
    // Deliberately stateless: navigating away re-applies the page's own
    // options, so what you see is always what the current code does.
    ;(window as unknown as Record<string, unknown>).artsLightboxPlayground = { reboot: boot }
    boot(pageOptions())
    if (instance) {
      resolveReady(instance)
    }
    return
  }

  boot(pageOptions())
})

/**
 * A page may boot the engine with its own options through frontmatter:
 *
 *   ---
 *   lightbox:
 *     ui: { thumbnails: true }
 *   ---
 *
 * Features that ship off by default would otherwise be invisible in the very
 * harness meant to exercise them — a page that demonstrates something should
 * demonstrate it on arrival, not after an incantation.
 */
function pageOptions(): TDeepPartial<IOptions> | undefined {
  return frontmatter.value.lightbox as TDeepPartial<IOptions> | undefined
}

// Re-boot when SPA navigation lands on a page that asks for different options.
watch(
  () => frontmatter.value.lightbox,
  () => {
    const playground = (window as unknown as Record<string, { reboot?: (o?: unknown) => void }>)
      .artsLightboxPlayground
    playground?.reboot?.(pageOptions())
  }
)
</script>

<template>
  <Layout />
</template>
