import { createVitestConfig } from '@arts/wp-plugin-tooling/vitest'
import { defineConfig } from 'vitest/config'

// Shared shape (node env, @ts test-only alias, v8 coverage) — see the tooling
// package for the rationale.
const shared = createVitestConfig({
  defineKey: '__ARTS_IMMERSIVE_LIGHTBOX_VERSION__',
  setupFiles: ['tests/ts/setup.ts']
})

export default defineConfig({
  ...shared,
  test: {
    ...shared.test,
    coverage: {
      ...shared.test.coverage,
      // The vendored PhotoSwipe fork keeps its own upstream behavior and
      // device-verification contract. Coverage gates describe our engine.
      exclude: [...shared.test.coverage.exclude, 'src/ts/photoswipe/**'],
      thresholds: {
        lines: 95,
        statements: 95,
        functions: 97,
        branches: 90
      }
    }
  }
})
