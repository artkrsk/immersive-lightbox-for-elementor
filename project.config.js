import process from 'node:process'

export default {
  slug: 'better-lightbox-for-elementor',
  versionConstant: 'ARTS_BETTER_LIGHTBOX_PLUGIN_VERSION',
  defineKey: '__ARTS_BETTER_LIGHTBOX_VERSION__',
  esbuildTarget: 'es2022',
  entry: { ts: './src/ts/boot.ts', sass: './src/styles/index.scss' },
  // The gate is inlined into HTML by PHP: no banner (per-page weight), no
  // sourcemap (its URL would 404 against the page).
  bundles: [{ name: 'gate', entry: './src/ts/gate.ts', banner: 'none' }],
  bannerLines: [],
  zip: { budgetMb: 0.15 },
  paths: { php: './src/php', plugin: './src/wordpress-plugin', dist: './dist' },
  // Machine-specific: the Local site's plugin dir, from the gitignored .env (DEV_TARGET)
  devTarget: process.env.DEV_TARGET ?? null,
  // null = derived from the slug (collision-proof across sibling plugins)
  vendor: { autoloaderOnly: true, autoloaderSuffix: null },
  blueprint: null
}
