import { compile } from 'sass'
import { describe, expect, it } from 'vitest'

/**
 * The fork stamps `pswp__hide-on-close` onto every element it appends to the
 * root or the wrapper, and the vendored stylesheet claims both `opacity` and
 * `pointer-events` for it through two-class selectors. Any rule of ours that
 * wants either property back has to match that specificity, which in practice
 * means scoping under `.pswp` — one class silently loses, and loses only in a
 * real browser, where no unit test can see it.
 *
 * That collision has already caused three separate bugs. This asserts the
 * shape of the shipped stylesheet, which is the part that can be checked here.
 */
const CONTESTED = ['opacity', 'pointer-events']

/**
 * The chrome `registerElement` creates — only these carry the stamped class.
 * Their `_modifier` variants sit on the same element and count; their
 * `__child` elements are never stamped and are free to set what they like,
 * since a child's opacity multiplies against the parent's rather than
 * competing with it. The flight layer is absent on purpose: it lives on
 * `body`, outside the root entirely.
 */
const CHROME_ROOTS = [
  'arts-lightbox-counter',
  'arts-lightbox-caption',
  'arts-lightbox-close',
  'arts-lightbox-download',
  'arts-lightbox-slideshow',
  'arts-lightbox-sound',
  'arts-lightbox-arrow',
  'arts-lightbox-thumbs'
]

/** Matches a chrome root or one of its `_modifier` forms, never `__child`. */
function targetsChromeRoot(selectorPart: string): boolean {
  return CHROME_ROOTS.some((root) =>
    new RegExp(`\\.${root}(_[a-z-]+)?(?![\\w-])`).test(selectorPart)
  )
}

function rulesTouching(css: string, properties: string[]): { selector: string }[] {
  const out: { selector: string }[] = []
  const rule = /([^{}]+)\{([^{}]*)\}/g
  let match = rule.exec(css)
  while (match) {
    const selector = (match[1] ?? '').trim()
    const declarations = match[2] ?? ''
    if (properties.some((property) => declarations.includes(`${property}:`))) {
      out.push({ selector })
    }
    match = rule.exec(css)
  }
  return out
}

describe('shipped stylesheet', () => {
  const css = compile('src/styles/index.scss', { loadPaths: ['src/styles', 'node_modules'] }).css

  it('scopes every contested chrome declaration under .pswp', () => {
    const unscoped = rulesTouching(css, CONTESTED)
      .filter(({ selector }) =>
        // One bare part is enough to lose the cascade for what it targets.
        selector.split(',').some((part) => targetsChromeRoot(part) && !part.includes('.pswp'))
      )
      .map(({ selector }) => selector.replace(/\s+/g, ' '))

    expect(unscoped).toEqual([])
  })

  it('still hands chrome opacity to the transition clock', () => {
    // The other direction: scoped, but no longer reading the clock.
    expect(css).toContain('opacity: var(--arts-lightbox-chrome, 1)')
  })

  it('hides only the slides during a flight, not their chrome-bearing ancestor', () => {
    // `.pswp__scroll-wrap` also holds the top bar and the arrows, so masking it
    // pinned that chrome invisible for the whole choreography and then revealed
    // it in one untransitioned step. The container holds only slides.
    const masked = rulesTouching(css, ['opacity'])
      .map(({ selector }) => selector.replace(/\s+/g, ' '))
      .filter((selector) => selector.includes('arts-lightbox-transitioning'))

    expect(masked).toContain('.pswp.arts-lightbox-transitioning .pswp__container')
    expect(masked.some((s) => s.includes('.pswp__scroll-wrap'))).toBe(false)
  })
})
