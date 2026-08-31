// Vitest's Vite runtime provides import.meta.env; the esbuild plugin bundle
// substitutes import.meta.env.DEV via define (true in the dev channel, false
// in production, where the guarded blocks are dropped). Optional access keeps
// the checks safe in any bundler without the define.
interface ImportMeta {
  env?: { DEV?: boolean }
}

/** Stamped from composer.json by the esbuild define — plugin bundle only. */
declare const __ARTS_IMMERSIVE_LIGHTBOX_VERSION__: string

/** The editor bundle imports its companion stylesheet; esbuild emits it as
 * editor.css beside editor.js. The import resolves to nothing in TS. */
declare module '*.css'
