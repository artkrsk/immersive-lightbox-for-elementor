import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { HOST_CLASS } from '@ts/constants'
import { compile } from 'sass'
import { describe, expect, it } from 'vitest'

/**
 * Our class names are PhotoSwipe's, and a page can carry a second PhotoSwipe
 * — WooCommerce prints a 4.x `.pswp` in the footer. Unscoped, our layer
 * restyled it (`.pswp__bg { display: none }` took its backdrop away), and no
 * browser-free test could see that happen. What can be checked is the shape:
 * every rule on lightbox DOM sits under the host our root mounts in.
 */
const SCOPE = `:where(.${HOST_CLASS})`

/**
 * DOM of ours that lives OUTSIDE the root, so outside the host too: the
 * flight detaches to `body` for the close's last frames, and a cursor
 * follower draws the zoom glyph in its own element.
 */
const OUTSIDE_ROOT = [
  /\.arts-lightbox-flight(?![\w-])/,
  /\.arts-lightbox-flight(_|__)/,
  /\.arts-lightbox-zoom/
]

const css = compile('src/styles/index.scss', { loadPaths: ['src/styles', 'node_modules'] }).css

/** Every complex selector in a style rule, comments and at-rule preludes aside. */
function selectorParts(source: string): string[] {
  const stripped = source.replace(/\/\*[\s\S]*?\*\//g, '')
  const parts: string[] = []
  for (const match of stripped.matchAll(/([^{};]+)\{/g)) {
    const prelude = (match[1] ?? '').trim()
    if (prelude === '' || prelude.startsWith('@') || /^(from|to|\d+%)$/.test(prelude)) {
      continue
    }
    for (const part of prelude.split(',')) {
      parts.push(part.replace(/\s+/g, ' ').trim())
    }
  }
  return parts
}

describe('shipped stylesheet scope', () => {
  const parts = selectorParts(css)

  it('scopes every rule on lightbox DOM to the host', () => {
    const unscoped = parts.filter(
      (part) =>
        /pswp|arts-lightbox-/.test(part) &&
        !part.includes(SCOPE) &&
        !OUTSIDE_ROOT.some((outside) => outside.test(part))
    )

    expect(unscoped).toEqual([])
  })

  it('never adds specificity for the scope', () => {
    // `:where()` counts zero, so every tie the other style suites assert is
    // the same tie it was before the scope existed.
    const bare = css.replaceAll(SCOPE, '')

    expect(bare).not.toContain(HOST_CLASS)
  })

  it('keeps page-level ancestors outside the scope', () => {
    // `html.x`, `body.y` and `[dir]` sit ABOVE the host. Nested the naive way
    // they land inside it, where nothing matches — silently dead rules.
    const misplaced = parts.filter((part) =>
      new RegExp(`${SCOPE.replace(/[().]/g, '\\$&')}.*\\s(html|body|\\[dir)`).test(part)
    )

    expect(misplaced).toEqual([])
    expect(parts).toContain(`html.has-cursor-follower ${SCOPE} .pswp__container`)
    expect(parts).toContain(`body.admin-bar ${SCOPE} .pswp`)
    expect(parts).toContain(`[dir=rtl] ${SCOPE} .pswp`)
  })

  it('carries the vendored keyframes through the scope unchanged', () => {
    expect(css).toMatch(/@keyframes pswp-clockwise \{\s*0% \{/)
  })

  it('narrows the cursor-follower scope to the same root', () => {
    // A bare `.pswp` scope drew our glyphs over WooCommerce's lightbox too.
    const bridge = readFileSync(
      resolve(__dirname, '../../../src/php/Elementor/CursorFollowerBridge.php'),
      'utf8'
    )

    expect(bridge).toContain(`'.${HOST_CLASS} > .pswp'`)
  })
})
