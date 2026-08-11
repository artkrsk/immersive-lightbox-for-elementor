<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import { onMounted } from 'vue'
import { createLightbox } from '@engine'
import type { ILightbox, IOptions, TDeepPartial } from '@engine'

const { Layout } = DefaultTheme

// The docs boot the engine the way the WordPress plugin does — a discovery
// global in the documented shape — so every example on these pages (and the
// reader's own console) speaks the documented contract. Not a reuse of
// boot.ts: that entry is WordPress-specific (options global, esbuild-injected
// version). Layout.vue is the persistent SPA root, so this runs once per full
// page load and the engine survives client-side navigation.
onMounted(() => {
  if (window.artsLightbox) {
    return
  }
  let instance: ILightbox | null = null
  let resolveReady!: (lightbox: ILightbox) => void
  const ready = new Promise<ILightbox>((resolve) => {
    resolveReady = resolve
  })
  window.artsLightbox = { ready, get: () => instance, version: 'docs' }
  const boot = (options?: TDeepPartial<IOptions>): void => {
    instance?.destroy()
    instance = createLightbox(options)
    instance.init()
  }
  boot()
  // Playground-only helper: flip options live from the console, e.g.
  //   artsLightboxPlayground.reboot({ transition: { close: 'through' } })
  ;(window as unknown as Record<string, unknown>).artsLightboxPlayground = { reboot: boot }
  if (instance) {
    resolveReady(instance)
  }
})
</script>

<template>
  <Layout />
</template>
