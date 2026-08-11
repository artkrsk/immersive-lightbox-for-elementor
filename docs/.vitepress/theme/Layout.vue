<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import { onMounted } from 'vue'
import { createLightbox } from '@engine'
import type { ILightbox } from '@engine'

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
  instance = createLightbox()
  instance.init()
  resolveReady(instance)
})
</script>

<template>
  <Layout />
</template>
