import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * Elementor scopes its URL-control popover CSS to the auto-generated type
 * class `.elementor-control-type-url`. Our control registers as its own type
 * (`url_arts_lightbox`), so NONE of those rules match it — without a re-scoped
 * companion stylesheet the more-options block renders flat (no display:none)
 * and the autocomplete spinner shows permanently. The editor bundle imports
 * this stylesheet so esbuild emits editor.css beside editor.js.
 */
const SCOPE = '.elementor-control-type-url_arts_lightbox'

function rules(css: string): { selector: string; body: string }[] {
  const out: { selector: string; body: string }[] = []
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const rule = /([^{}]+)\{([^{}]*)\}/g
  let match = rule.exec(stripped)
  while (match) {
    out.push({ selector: (match[1] ?? '').trim(), body: match[2] ?? '' })
    match = rule.exec(stripped)
  }
  return out
}

describe('editor control stylesheet', () => {
  const css = readFileSync('src/styles/editor.css', 'utf8')

  it('scopes every rule under our control-type class', () => {
    const unscoped = rules(css)
      .filter(({ selector }) => selector.split(',').some((part) => !part.includes(SCOPE)))
      .map(({ selector }) => selector)
    expect(unscoped).toEqual([])
  })

  it('hides the popover and the spinner by default — the two load-bearing rules', () => {
    const all = rules(css)
    const popover = all.find(
      ({ selector }) =>
        selector.endsWith('.elementor-control-url-more-options') && selector.includes(SCOPE)
    )
    const spinner = all.find(({ selector }) =>
      selector.endsWith('.elementor-control-url-autocomplete-spinner')
    )
    expect(popover?.body).toContain('display: none')
    expect(spinner?.body).toContain('display: none')
  })

  it('ships with the editor bundle', () => {
    // The import is what makes esbuild emit editor.css next to editor.js —
    // a stylesheet nothing imports never reaches the editor.
    expect(readFileSync('src/ts/editor.ts', 'utf8')).toContain("import '../styles/editor.css'")
  })
})
