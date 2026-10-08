import { spawnSync } from 'node:child_process'
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { compile } from 'sass'

const root = fileURLToPath(new URL('..', import.meta.url))
const esm = join(root, 'dist/esm')
const types = join(root, 'dist/types')
const require = createRequire(import.meta.url)
await rm(esm, { recursive: true, force: true })
await rm(types, { recursive: true, force: true })
await mkdir(esm, { recursive: true })
await build({
  absWorkingDir: root,
  entryPoints: { index: 'src/ts/index.ts', contract: 'src/ts/contract/index.ts', gate: 'src/ts/gate/index.ts' },
  outdir: esm,
  bundle: true,
  splitting: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  define: { 'import.meta.env.DEV': 'false' }
})
await writeFile(join(esm, 'styles.css'), compile(join(root, 'src/styles/index.scss'), { style: 'compressed' }).css)
const config = join(root, 'dist/tsconfig.library.json')
await writeFile(config, JSON.stringify({
  compilerOptions: {
    target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler',
    lib: ['ES2022', 'DOM', 'DOM.Iterable'], strict: true,
    noUncheckedIndexedAccess: true, exactOptionalPropertyTypes: true,
    declaration: true, emitDeclarationOnly: true, skipLibCheck: false, types: [],
    rootDir: '../src/ts', outDir: './types', resolveJsonModule: true
  },
  files: ['../src/ts/index.ts', '../src/ts/contract/index.ts', '../src/ts/gate/index.ts']
}))
try {
  const result = spawnSync(process.execPath, [join(dirname(require.resolve('typescript/package.json')), 'bin/tsc'), '-p', config], {
    cwd: root, stdio: 'inherit'
  })
  if (result.status !== 0) { throw new Error('Library declaration emit failed') }
  await copyFile(join(root, 'src/ts/env.d.ts'), join(types, 'env.d.ts'))
  await copyFile(join(root, 'src/ts/contract/events.d.ts'), join(types, 'contract/events.d.ts'))
  for (const [entry, reference] of [['index.d.ts', './contract/events.d.ts'], ['contract/index.d.ts', './events.d.ts'], ['gate/index.d.ts', '../contract/events.d.ts']]) {
    const path = join(types, entry)
    const declaration = await readFile(path, 'utf8')
    await writeFile(path, `/// <reference path="${reference}" />\n${declaration}`)
  }
} finally {
  await rm(config, { force: true })
}
