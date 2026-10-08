// Vitest's Vite runtime provides import.meta.env; the esbuild plugin bundle
// substitutes import.meta.env.DEV via define (true in the dev channel, false
// in production, where the guarded blocks are dropped). Optional access keeps
// the checks safe in any bundler without the define.
// Match Vite's named augmentation so direct library hosts can include vite/client too.
interface ImportMetaEnv {
  readonly DEV: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** The editor bundle imports its companion stylesheet; esbuild emits it as
 * editor.css beside editor.js. The import resolves to nothing in TS. */
declare module '*.css'
