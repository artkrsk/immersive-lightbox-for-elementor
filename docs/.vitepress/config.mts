import path from 'node:path'
import { defineConfig } from 'vitepress'

// Docs site for the plugin — and the engine's browser harness. `base` comes
// from CI (DOCS_BASE_PATH must match the GitHub repo name exactly); local
// dev/build serve from '/'. The aliases mirror what the engine source
// expects: the docs are a first-class Vite consumer of `src/ts` and
// `src/styles`, same as the WordPress bundle.
export default defineConfig({
  title: 'Arts Better Lightbox for Elementor',
  description:
    'A PhotoSwipe-powered lightbox that replaces Elementor’s native one: curtain transitions, mouse-drag navigation, explore pan, thumbnails, video slides.',
  base: process.env.DOCS_BASE_PATH || '/',
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: 'Transitions', link: '/transitions' },
      { text: 'Galleries', link: '/gallery' },
      { text: 'Content', link: '/content' },
      { text: 'Video', link: '/videos' },
      { text: 'Developers', link: '/developers' }
    ],
    sidebar: [
      {
        text: 'Playground',
        items: [
          { text: 'Basic grid', link: '/' },
          { text: 'Transitions', link: '/transitions' },
          { text: 'Galleries', link: '/gallery' },
          { text: 'Content types', link: '/content' },
          { text: 'Video', link: '/videos' }
        ]
      },
      { text: 'Developers', link: '/developers' }
    ],
    search: { provider: 'local' },
    footer: {
      message: 'Released under the GPL-3.0 License',
      copyright: 'Copyright © 2026 Artem Semkin'
    }
  },
  vite: {
    // esbuild stamps the version in plugin bundles; the docs' Vite build
    // supplies its own value so engine modules can reference the constant.
    define: {
      __ARTS_BETTER_LIGHTBOX_VERSION__: JSON.stringify('docs')
    },
    resolve: {
      alias: {
        '@engine': path.resolve(process.cwd(), 'src/ts/index.ts'),
        '@styles': path.resolve(process.cwd(), 'src/styles')
      }
    },
    server: {
      // LAN-exposed: on-device iOS testing is part of the playground phase
      // (gesture physics only verify on real touch hardware).
      host: true,
      watch: {
        // dist/cache live inside the source root; without this, every
        // `docs:build` force-reloads any open docs:dev tab.
        ignored: ['**/docs/.vitepress/dist/**', '**/docs/.vitepress/cache/**']
      }
    }
  }
})
