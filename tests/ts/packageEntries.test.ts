import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { build } from 'esbuild'
import { Window } from 'happy-dom'
import { afterAll, describe, expect, it } from 'vitest'

// This consumer has its own node_modules and no producer tsconfig, globals or Vite ambient types.
const root = fileURLToPath(new URL('../..', import.meta.url))
const fixture = mkdtempSync(join(tmpdir(), 'arts-package-consumer-'))
const packageName = '@arts/immersive-lightbox'
const version = JSON.parse(readFileSync(join(root, 'composer.json'), 'utf8')).version as string
const require = createRequire(import.meta.url)
const tsc = join(dirname(require.resolve('typescript/package.json')), 'bin/tsc')
mkdirSync(join(fixture, 'node_modules/@arts'), { recursive: true })
symlinkSync(root, join(fixture, 'node_modules', packageName), 'dir')

writeFileSync(join(fixture, 'package.json'), JSON.stringify({ type: 'module' }))
writeFileSync(
  join(fixture, 'tsconfig.json'),
  JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      customConditions: ['arts-source'],
      lib: ['ES2022', 'DOM', 'DOM.Iterable'],
      strict: true,
      noEmit: true,
      skipLibCheck: false,
      types: [],
      verbatimModuleSyntax: true
    },
    files: ['consumer.ts']
  })
)
afterAll(() => rmSync(fixture, { recursive: true, force: true }))

const compileTypes = (source: string) => {
  writeFileSync(join(fixture, 'consumer.ts'), source)
  const result = spawnSync(
    process.execPath,
    [tsc, '-p', join(fixture, 'tsconfig.json'), '--listFiles'],
    {
      encoding: 'utf8',
      cwd: fixture
    }
  )
  expect(result.status, result.stdout + result.stderr).toBe(0)
  return result.stdout.replaceAll('\\', '/')
}

const bundle = (specifier: string, define: Record<string, string> = {}) =>
  build({
    stdin: { contents: `export * from '${specifier}'`, resolveDir: fixture, loader: 'ts' },
    bundle: true,
    write: false,
    format: 'iife',
    globalName: 'Provider',
    platform: 'browser',
    metafile: true,
    logLevel: 'silent',
    conditions: ['arts-source'],
    define
  })

describe('published source package entries', () => {
  it('typechecks contract consumers without engine or producer declarations', () => {
    const files = compileTypes(`
import type { ILightbox as Contract } from '@arts/immersive-lightbox/contract'
declare const api: Contract
void api
document.addEventListener('arts-lightbox:change', (event) => { const direction: 1 | -1 = event.detail.direction; void direction })
document.addEventListener('arts-lightbox:ready', (event) => { const engine: Contract = event.detail; void engine })
// @ts-expect-error Contract consumers do not acquire producer env declarations.
import.meta.env
`)
    expect(files).not.toMatch(/\/src\/ts\/(?:core|photoswipe|elementor)\//)
    expect(files).not.toMatch(/\/src\/ts\/(?:env\.d\.ts|boot\.ts|global\.d\.ts)/)
  })

  it('preserves the root factory and legacy root types in an isolated consumer', () => {
    compileTypes(`
import { createLightbox } from '@arts/immersive-lightbox'
import type { ILightbox as Legacy } from '@arts/immersive-lightbox'
import type { ILightbox as Contract } from '@arts/immersive-lightbox/contract'
const accepts = (value: Legacy): Contract => value
void accepts; void createLightbox
document.addEventListener('arts-lightbox:change', event => { const direction: 1 | -1 = event.detail.direction; void direction })
`)
  })

  it('merges root typing with the host ImportMeta environment', () => {
    compileTypes(`import { createLightbox } from '@arts/immersive-lightbox'
      declare global {
        interface ImportMetaEnv { readonly DEV: boolean; readonly PROD: boolean }
        interface ImportMeta { readonly env: ImportMetaEnv }
      }
      void createLightbox; void import.meta.env.PROD
    `)
  })

  it('bundles contracts without engines, boot, DOM or host defines', async () => {
    const result = await bundle(`${packageName}/contract`)
    const inputs = Object.keys(result.metafile.inputs)
    const allowed = ['/contract/index.ts', '/constants/eventNames.ts']
    expect(
      inputs
        .filter((path) => path !== '<stdin>')
        .every((path) => allowed.some((suffix) => path.endsWith(suffix)))
    ).toBe(true)
    const code = result.outputFiles[0]?.text ?? ''
    expect(code).not.toMatch(/__ARTS_|\b(?:window|document)\b|addEventListener/)
    const context: Record<string, unknown> = {}
    runInNewContext(code, context)
    expect(Object.keys(context.Provider as object).sort()).toEqual([
      'EVENT_CHANGE',
      'EVENT_DESTROY',
      'EVENT_OPEN'
    ])
  })

  it('keeps root import passive and invokes the factory under its host contract', async () => {
    const result = await bundle(packageName, { 'import.meta.env.DEV': 'false' })
    const code = result.outputFiles[0]?.text ?? ''
    const passive: Record<string, unknown> = {}
    runInNewContext(code, passive)
    expect(passive.Provider).toHaveProperty('createLightbox')
    expect(passive.Provider).not.toHaveProperty('default')
    const window = new Window()
    try {
      runInNewContext(
        `${code}
const instance = Provider.createLightbox(); if (instance.version !== ${JSON.stringify(version)}) throw Error('incorrect package version');`,
        { window, document: window.document, performance, AbortController, structuredClone }
      )
      expect(window.document.body.children).toHaveLength(0)
    } finally {
      await window.happyDOM.close()
    }
  })

  it('constructs the engine and a passive app without a host version define', async () => {
    const result = await bundle(packageName)
    const context: Record<string, unknown> = { structuredClone, AbortController }
    runInNewContext(result.outputFiles[0]?.text ?? '', context)
    expect(runInNewContext('Provider.createLightbox().version', context)).toBe(version)
    expect(() => runInNewContext('Provider.createLightboxApp()', context)).not.toThrow()
  })

  it('keeps the gate passive and excludes the engine graph', async () => {
    const result = await bundle(`${packageName}/gate`)
    expect(Object.keys(result.metafile.inputs).join('\n')).not.toMatch(
      /photoswipe|createLightbox\.ts|engineState|wordpress/
    )
    const context: Record<string, unknown> = { AbortController }
    runInNewContext(result.outputFiles[0]?.text ?? '', context)
    expect(() =>
      runInNewContext(
        "Provider.createLightboxGate({ enabled: true, css: 'style.css', js: 'boot.js' })",
        context
      )
    ).not.toThrow()
    compileTypes(`import { createLightboxGate } from '@arts/immersive-lightbox/gate'
      import { createLightboxApp } from '@arts/immersive-lightbox'
      const gate = createLightboxGate({ enabled: true, css: 'style.css', load: async signal => {
        createLightboxApp({ signal }).init()
      } })
      gate.init(); gate.destroy()
    `)
  })

  it('preserves manifest and extensionful source compatibility imports', async () => {
    const result = await bundle(`${packageName}/src/ts/index.ts`)
    expect(result.outputFiles[0]?.text).toContain('createLightbox')
    const consumerRequire = createRequire(join(fixture, 'consumer.cjs'))
    const manifest = JSON.parse(
      readFileSync(consumerRequire.resolve(`${packageName}/package.json`), 'utf8')
    )
    expect(manifest.name).toBe(packageName)
    expect(resolve(consumerRequire.resolve(`${packageName}/src/styles/index.scss`))).toBe(
      join(root, 'src/styles/index.scss')
    )
  })
})
