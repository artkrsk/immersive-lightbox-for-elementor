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
  const STORAGE_KEY = 'arts-lightbox-playground-options'
  const boot = (options?: TDeepPartial<IOptions>): void => {
    instance?.destroy()
    instance = createLightbox(options)
    instance.init()
  }
  let stored: TDeepPartial<IOptions> | undefined
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    stored = raw ? (JSON.parse(raw) as TDeepPartial<IOptions>) : undefined
  } catch {
    stored = undefined
  }
  boot(stored)
  if (stored) {
    console.info('[arts-lightbox playground] active reboot options:', stored)
  }
  // Playground-only helper: flip options live from the console, e.g.
  //   artsLightboxPlayground.reboot({ transition: { close: 'through' } })
  // Options persist for this tab across reloads; reboot() resets to defaults.
  ;(window as unknown as Record<string, unknown>).artsLightboxPlayground = {
    reboot: (options?: TDeepPartial<IOptions>) => {
      try {
        if (options) {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(options))
        } else {
          sessionStorage.removeItem(STORAGE_KEY)
        }
      } catch {
        // storage unavailable — reboot still applies for this page view
      }
      boot(options)
    }
  }
  if (instance) {
    resolveReady(instance)
  }
})
</script>

<template>
  <Layout />
</template>
