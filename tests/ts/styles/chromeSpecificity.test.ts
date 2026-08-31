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
 * competing with it. The flight layer is absent on purpose: we append it
 * ourselves rather than through `registerElement`, so it is never stamped —
 * mounted inside the root or detached to `body`, the collision cannot reach
 * it.
 */
const CHROME_ROOTS = [
  'arts-lightbox-counter',
  'arts-lightbox-caption',
  'arts-lightbox-close',
  'arts-lightbox-arrow',
  'arts-lightbox-thumbs'
]

/**
 * Chrome registered with `appendTo: 'bar'` — it rides inside `.pswp__top-bar`,
 * which already carries the admin-bar offset, so none of it may re-apply that.
 */
const IN_BAR_CHROME = ['arts-lightbox-counter', 'arts-lightbox-close']

/** Matches a chrome root or one of its `_modifier` forms, never `__child`. */
function targetsChromeRoot(selectorPart: string): boolean {
  return CHROME_ROOTS.some((root) =>
    new RegExp(`\\.${root}(_[a-z-]+)?(?![\\w-])`).test(selectorPart)
  )
}

function rulesTouching(css: string, properties: string[]): { selector: string; body: string }[] {
  const out: { selector: string; body: string }[] = []
  const rule = /([^{}]+)\{([^{}]*)\}/g
  let match = rule.exec(css)
  while (match) {
    const selector = (match[1] ?? '').trim()
    const declarations = match[2] ?? ''
    if (properties.some((property) => declarations.includes(`${property}:`))) {
      out.push({ selector, body: declarations })
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
    // The other direction: scoped, but no longer reading the clock. The tap
    // toggle multiplies in as a second FACTOR, never a second owner: the
    // clock writes its own property, the ui state its own, and opacity is
    // their product.
    expect(css).toContain(
      'opacity: calc(var(--arts-lightbox-chrome, 1) * var(--arts-lightbox-ui-visible, 1))'
    )
  })

  it('hides every piece of chrome when a tap toggles the UI off', () => {
    // Stock behavior: a touch tap flips `pswp--ui-visible` on the root
    // (tapAction 'toggle-controls'). The fork's own fade only ever reached
    // the top bar here — our chrome group deliberately outranks the stamped
    // hide-on-close rules so the clock owns opacity — so the toggle is
    // reimplemented against the class itself, as a multiplied factor.
    const uiOff = rulesTouching(css, ['--arts-lightbox-ui-visible']).find(({ selector }) =>
      selector.includes(':not(.pswp--ui-visible)')
    )
    expect(uiOff?.body).toContain('--arts-lightbox-ui-visible: 0')

    // The factor is a registered property so the flip can FADE — and it
    // transitions on the root, never on `opacity`, which stays the clock's.
    expect(css).toMatch(/@property --arts-lightbox-ui-visible \{[^}]*initial-value: 1/)
    expect(css).toMatch(/@property --arts-lightbox-ui-visible \{[^}]*inherits: true/)
    const root = rulesTouching(css, ['transition']).filter(
      ({ selector, body }) =>
        selector.trim().endsWith('.pswp') && body.includes('transition: --arts-lightbox-ui-visible')
    )
    expect(root.length).toBeGreaterThan(0)

    // Invisible chrome answers no taps. The close button needs this
    // explicitly — the vendored `.pswp__top-bar > *` keeps bar children
    // `auto` no matter what the stamped class says — and so do the tiles,
    // which re-claim the pointer at child level below their dead strip.
    const dead = rulesTouching(css, ['pointer-events']).filter(({ selector }) =>
      selector.includes(':not(.pswp--ui-visible)')
    )
    const deadSelectors = dead.map(({ selector }) => selector.replace(/\s+/g, ' ')).join(',')
    for (const root of CHROME_ROOTS) {
      expect(deadSelectors).toContain(`.${root}`)
    }
    expect(deadSelectors).toContain('.arts-lightbox-thumbs__item')
    for (const { body } of dead) {
      expect(body).toContain('pointer-events: none')
    }

    // The bar container stays opaque: the fork fades it as a proxy for its
    // children, but ours carry their own opacity — and under our engine the
    // stamped `--pswp-transition-duration` is 0ms, so its "fade" was a snap
    // that hid the close and counter before their own fade could show.
    const bar = rulesTouching(css, ['opacity']).find(
      ({ selector }) => selector.replace(/\s+/g, ' ').trim() === '.pswp .pswp__top-bar'
    )
    expect(bar?.body).toContain('opacity: 1')
  })

  it('gives the flight both a mounted and a detached z-index', () => {
    // Mounted it must sit under the chrome; detached — for the frames that
    // outlive the root's teardown — it must clear the whole lightbox. Losing
    // either rule breaks one direction silently.
    const flight = rulesTouching(css, ['z-index'])
      .map(({ selector }) => selector.replace(/\s+/g, ' '))
      .filter((selector) => selector.includes('arts-lightbox-flight'))

    expect(flight).toContain('.arts-lightbox-flight')
    expect(flight).toContain('.pswp .arts-lightbox-flight')
  })

  it('layers under the admin bar only where the bar exists', () => {
    // Native parity: Elementor's lightbox sits below #wpadminbar's 99999.
    // Two declarations on purpose — the vendored `.pswp` rule re-declares the
    // var (inheritance from body loses there), while the close-flight
    // detached to `body` can only reach it through inheritance.
    expect(css).toContain('body.admin-bar {')
    expect(css).toContain('body.admin-bar .pswp {')
    expect(css.match(/--pswp-root-z-index: 99997/g)).toHaveLength(2)
  })

  it('drops the top chrome below the measured admin-bar overlap, exactly once', () => {
    // The bar is opaque; chrome pinned to the viewport top would hide under
    // it. The offset var is stamped on the root by createOpener per open, and
    // belongs on whatever is positioned against the VIEWPORT — the fork's top
    // bar, and the thumbnail strips that mount on the root.
    const offset = rulesTouching(css, ['top']).filter(({ body }) =>
      body.includes('--arts-lightbox-admin-bar')
    )
    expect(offset.some(({ selector }) => selector.includes('pswp__top-bar'))).toBe(true)

    // Anything inside that bar is already carried down by it. The counter
    // repeated the term and sank a whole bar-height below the close button it
    // shares the row with — invisible until a WordPress admin bar exists.
    for (const { selector } of offset) {
      for (const inBar of IN_BAR_CHROME) {
        expect(selector).not.toContain(inBar)
      }
    }
  })

  it('lets the thumbnail strip yield to the top bar, not displace it', () => {
    // The strip mounts on the root AFTER the scroll-wrap, at the same z-index
    // the fork gives the top bar, so tree order paints it over the close
    // button and the counter — and takes their clicks.
    // The bar's corners are anchors and stay put; the strip gives way: only
    // the tiles answer the pointer, the top strip's window stops short of the
    // corners, and a side column starts below the bar's row.
    const pointer = rulesTouching(css, ['pointer-events'])
    const strip = pointer.find(({ selector }) => selector.trim() === '.pswp .arts-lightbox-thumbs')
    expect(strip?.body).toContain('pointer-events: none')
    const tile = pointer.find(({ selector }) => selector.trim() === '.arts-lightbox-thumbs__item')
    expect(tile?.body).toContain('pointer-events: auto')

    // The top bar itself never moves for a rail.
    const bar = rulesTouching(css, ['top', 'left', 'right', 'width']).filter(({ selector }) =>
      selector.includes('pswp__top-bar')
    )
    expect(bar.map(({ body }) => body).join('\n')).not.toContain('thumbs')

    const top = rulesTouching(css, ['left', 'right']).find(
      ({ selector }) => selector.trim() === '.arts-lightbox-thumbs_top'
    )
    expect(top?.body).toMatch(/left: calc\(/)
    expect(top?.body).toMatch(/right: calc\(/)

    const columns = rulesTouching(css, ['top', 'bottom']).find(({ selector }) =>
      /thumbs_left[\s\S]*thumbs_right/.test(selector)
    )
    expect(columns?.body).toMatch(
      /top: calc\(var\(--arts-lightbox-admin-bar, 0px\) \+ var\(--arts-lightbox-inset-y-resolved\) \+ var\(--arts-lightbox-close-size, 56px\)\)/
    )
    expect(columns?.body).toMatch(
      /bottom: calc\(var\(--arts-lightbox-inset-y-resolved\) \+ var\(--arts-lightbox-close-size, 56px\)\)/
    )
  })

  it('measures every chrome edge from the same two insets', () => {
    // One line per edge: the arrows' and close's icon boxes, the counter, the
    // caption and the thumbnail tiles all sit `inset` from the viewport, and
    // the buttons overhang outward into it. The public pair is never declared
    // (see the sizing test); the resolved pair on `.pswp` carries the
    // responsive default, and it is the only thing a consumer may read.
    // Both vocabularies: chrome that mirrors with the document is placed
    // logically (`inset-inline*`), chrome pinned to a physical edge — the
    // thumbnail rails, whose side is a user's choice — stays physical.
    const positioned = rulesTouching(css, [
      'top',
      'right',
      'bottom',
      'left',
      'padding',
      'inset-inline',
      'inset-inline-start',
      'inset-inline-end'
    ])
    const reading = (fragment: string, axis: 'x' | 'y') =>
      positioned.some(
        ({ selector, body }) =>
          selector.includes(fragment) &&
          body.includes(`var(--arts-lightbox-inset-${axis}-resolved)`)
      )

    expect(reading('pswp__top-bar', 'x')).toBe(true)
    expect(reading('pswp__top-bar', 'y')).toBe(true)
    expect(reading('arts-lightbox-arrow_prev', 'x')).toBe(true)
    expect(reading('arts-lightbox-arrow_next', 'x')).toBe(true)
    expect(reading('arts-lightbox-caption', 'x')).toBe(true)
    expect(reading('arts-lightbox-caption', 'y')).toBe(true)
    expect(reading('arts-lightbox-thumbs_bottom', 'y')).toBe(true)
    expect(reading('arts-lightbox-thumbs_top', 'x')).toBe(true)
    expect(reading('arts-lightbox-thumbs_left', 'x')).toBe(true)
    expect(reading('arts-lightbox-thumbs_right', 'x')).toBe(true)

    // The counter and the close never position themselves against the
    // viewport — the bar is the row, and they live on it. Matched on the
    // VARIABLE, not on a bare `inset-`: the counter anchors to the bar's own
    // edge with `inset-inline-start: 0` (logical, so the row mirrors), and
    // that property name would otherwise read as a viewport measurement.
    for (const inBar of IN_BAR_CHROME) {
      const own = positioned.filter(({ selector }) => selector.includes(inBar))
      expect(own.map(({ body }) => body).join('\n')).not.toContain('--arts-lightbox-inset-')
    }

    // Touch widths pull the line in; a :root override still flows through the
    // fallback at both widths.
    expect(css).toMatch(
      /@media \(width <= 767px\)[^}]*\.pswp \{[^}]*--arts-lightbox-inset-x-resolved: var\(--arts-lightbox-inset-x, 16px\)/
    )
  })

  it("hides the thumbnail rail on touch widths at the strip's own specificity", () => {
    // The strip's base rule is `.pswp .arts-lightbox-thumbs { display: flex }`.
    // A one-class `display: none` in the media query lost to it, and the rail
    // showed on every phone while its source said it was hidden.
    expect(css).toMatch(
      /@media \(width <= 767px\)[^}]*\.pswp \.arts-lightbox-thumbs \{[^}]*display: none/
    )
  })

  it('styles the two caption lines on their own elements', () => {
    // The kit's Title / Description Typography groups target the lines, not
    // the container — a group on the container would leak into both.
    const sized = rulesTouching(css, ['font-size']).map(({ selector }) => selector)
    expect(sized.some((sel) => sel.includes('.arts-lightbox-caption__title'))).toBe(true)
    expect(sized.some((sel) => sel.includes('.arts-lightbox-caption__description'))).toBe(true)
    expect(sized.some((sel) => sel.trim() === '.pswp .arts-lightbox-caption')).toBe(false)
  })

  it('leaves chrome text overridable by kit typography', () => {
    // The kit's Caption / Counter Typography groups print unlayered rules
    // against these two classes and win by layer order alone — unless one of
    // our text declarations is important, which would reverse the order and
    // quietly defeat the control.
    const TEXT = [
      'font-family',
      'font-size',
      'font-weight',
      'font-style',
      'line-height',
      'letter-spacing',
      'word-spacing',
      'text-transform',
      'text-decoration'
    ]
    const pinned = rulesTouching(css, TEXT)
      .filter(({ selector }) => /arts-lightbox-(caption|counter)/.test(selector))
      .flatMap(({ selector, body }) =>
        body
          .split(';')
          .filter((decl) => TEXT.some((p) => decl.includes(`${p}:`)) && decl.includes('!important'))
          .map((decl) => `${selector.trim()} { ${decl.trim()} }`)
      )
    expect(pinned).toEqual([])
  })

  it('gives hover and caption color their own properties, falling back to the UI color', () => {
    // Elementor's kit has a hover color and a text color; both used to land
    // on --arts-lightbox-ui-color, so setting either recolored everything.
    // The fallback chain keeps a kit that sets only the UI color looking the
    // same as before these properties existed.
    const hover = 'var(--arts-lightbox-ui-hover-color, var(--arts-lightbox-ui-color, #efece6))'
    const caption = 'var(--arts-lightbox-caption-color, var(--arts-lightbox-ui-color, #efece6))'
    expect(css).toContain(`color: ${hover}`)
    expect(css).toContain(`color: ${caption}`)
  })

  it('never lets the button armor override the kit UI color with inherit', () => {
    // The ARMOR block re-states the baseline with !important to outrank
    // Elementor's unlayered kit-button rules. It shipped `color: inherit`,
    // which also outranked OUR base rule — the buttons took the theme's text
    // color and the kit's UI Color picker did nothing for them. Its comment
    // has always said values must match the base block; this asserts it.
    // The armor identifies itself by re-stating the whole baseline important;
    // the plain chrome group shares part of its selector list but no !important.
    const armored = rulesTouching(css, ['color']).filter(
      ({ selector, body }) =>
        selector.includes('.arts-lightbox-arrow') && body.includes('padding: 0 !important')
    )
    expect(armored.length).toBeGreaterThan(0)
    for (const { body } of armored) {
      expect(body).not.toContain('color: inherit')
      expect(body).toContain('color: var(--arts-lightbox-ui-color, #efece6) !important')
    }
  })

  it('pins the hover color important too, or the armor would outrank it', () => {
    const hoverRule = rulesTouching(css, ['color']).find(({ selector }) =>
      selector.includes('.arts-lightbox-arrow:hover')
    )
    expect(hoverRule?.body).toContain('!important')
  })

  it('applies the hover color to every interactive chrome root', () => {
    const hovered = rulesTouching(css, ['color'])
      .map(({ selector }) => selector.replace(/\s+/g, ' '))
      .filter((selector) => selector.includes('arts-lightbox-ui-hover-color') === false)
    // Each interactive root needs a :hover rule — a missing one is a button
    // that silently ignores the kit's hover picker.
    for (const root of ['arts-lightbox-arrow', 'arts-lightbox-close']) {
      expect(hovered.some((s) => s.includes(`.${root}:hover`))).toBe(true)
    }
  })

  it('animates the zoom glyph from the mirrored <html> state, not from JS', () => {
    // The glyph is drawn inside a cursor follower's element, outside our root
    // — its rules resolve on pointer crossings only, so a JS-swapped icon
    // would lag a zoom toggled under a still pointer. One stable pair of bars
    // whose vertical one collapses on the <html> class: plus becomes minus,
    // transitioned, with nothing to re-resolve.
    const bar = rulesTouching(css, ['transform']).filter(({ selector }) =>
      selector.includes('arts-lightbox-zoom__bar')
    )
    expect(bar.some(({ selector }) => selector.includes('arts-lightbox-zoomed-in'))).toBe(true)
    const transitioned = rulesTouching(css, ['transition']).some(({ selector }) =>
      selector.includes('arts-lightbox-zoom__bar')
    )
    expect(transitioned).toBe(true)
  })

  it('folds the arm onto its twin and turns the glyph, rather than hiding a bar', () => {
    // Nothing vanishes: the upright arm rotates down onto the flat one, so
    // the plus closes into the minus as one shape. A bar that scaled to zero
    // read as a disappearing trick at cursor size.
    const zoomedRules = rulesTouching(css, ['transform'])
      .filter(({ selector }) => selector.includes('arts-lightbox-zoomed-in'))
      .map(({ selector, body }) => ({ selector, body }))

    const arm = zoomedRules.find(({ selector }) => selector.includes('__bar_2'))
    expect(arm?.body).toContain('rotate(0')
    expect(arm?.body).not.toContain('scaleX(0)')

    // The whole glyph turns with it — the half-turn is what makes the swap
    // read as a motion rather than a state change.
    const glyph = zoomedRules.find(({ selector }) =>
      selector.trim().endsWith('.arts-lightbox-zoom')
    )
    expect(glyph?.body).toContain('rotate(180deg)')
  })

  it('gives the same two bars a third state: a cross where a click closes', () => {
    // Beside the image a click closes rather than zooms, so the plus opens
    // into a cross — another rotation of the same pair, which is what lets it
    // morph instead of cutting to a different icon. The region reaches the
    // glyph through <html> (slideRegion.ts), since it is drawn outside our root.
    const cross = rulesTouching(css, ['transform'])
      .filter(({ selector }) => selector.includes(':not(.arts-lightbox-over-image)'))
      .map(({ body }) => body)

    expect(cross.some((body) => body.includes('rotate(45deg)'))).toBe(true)
    expect(cross.some((body) => body.includes('rotate(-45deg)'))).toBe(true)
  })

  it('takes the OS cursor off the slides when a follower draws it, not off the chrome', () => {
    // Over a slide the follower draws a glyph naming what the click does, so
    // an OS cursor on the same pixels is one pointer too many. The chrome
    // keeps its own — a button should look like a button.
    const scoped = rulesTouching(css, ['cursor']).filter(({ selector }) =>
      selector.includes('has-cursor-follower')
    )
    expect(scoped.length).toBeGreaterThan(0)
    for (const { selector } of scoped) {
      expect(selector).toContain('.pswp__container')
    }
    expect(scoped.some(({ body }) => body.includes('cursor: none !important'))).toBe(true)
  })

  it('gives a video its pointer back, the one slide that keeps one', () => {
    // Its controls are real UI being aimed at, so a glyph over them is in the
    // way. Fullscreen is the sharp end: the video moves to the top layer and
    // ::backdrop hides the follower with the rest of the document, so blanking
    // the native cursor too would leave it with no pointer at all.
    const restored = rulesTouching(css, ['cursor'])
      .filter(({ selector }) => selector.includes('video'))
      .map(({ selector, body }) => ({ selector: selector.replace(/\s+/g, ' '), body }))

    expect(restored.length).toBeGreaterThan(0)
    for (const { selector, body } of restored) {
      expect(selector).toContain('has-cursor-follower')
      // Must outrank the blanket `.pswp__container *` rule, which is also
      // !important — a tag plus a class is what wins it.
      expect(selector).toContain('video.arts-lightbox-media')
      expect(body).toContain('!important')
      expect(body).not.toContain('cursor: none')
    }
  })

  it('sizes every armored button from a property declared on the root', () => {
    // The armor cuts both ways: our `!important` widths are in a cascade
    // layer, and for important declarations a layer OUTRANKS unlayered CSS —
    // so a theme cannot out-specify the width itself, at any specificity. The
    // property is the way in, and it has to be declared on `.pswp`: a value
    // declared on the component would beat an inherited one and silently
    // ignore a :root or .pswp override.
    const sized = rulesTouching(css, ['width']).map(({ selector, body }) => ({
      selector: selector.replace(/\s+/g, ' '),
      body
    }))

    for (const [root, prop] of [
      ['arts-lightbox-arrow', '--arts-lightbox-arrow-size'],
      ['arts-lightbox-close', '--arts-lightbox-close-size'],
      ['arts-lightbox-thumbs__item', '--arts-lightbox-thumb-size']
    ]) {
      const rule = sized.find(
        ({ selector, body }) => selector.includes(`.${root}`) && body.includes('width')
      )
      expect(rule, `${root} has a width rule`).toBeDefined()
      expect(rule?.body, `${root} sizes from ${prop}`).toContain(`var(${prop},`)
    }

    // And nothing DECLARES them: a value declared on an element beats an
    // inherited one, so a declaration anywhere would silently defeat a
    // :root override. The default lives in the fallback instead.
    for (const prop of [
      '--arts-lightbox-arrow-size',
      '--arts-lightbox-close-size',
      '--arts-lightbox-thumb-size',
      '--arts-lightbox-inset-x',
      '--arts-lightbox-inset-y'
    ]) {
      expect(css, `${prop} is never declared`).not.toContain(`${prop}:`)
    }
  })

  it('takes the blink icon off the text baseline, or it centres high', () => {
    // The button's flex blockifies the blink wrapper and stops there, so an
    // inline <svg> one level down still sits on the layer's baseline. The
    // line box then measures taller than the glyph and `align-items: center`
    // centres the box, landing the icon a few px high in a 56px button.
    const blocked = rulesTouching(css, ['display'])
      .map(({ selector, body }) => ({ selector: selector.replace(/\s+/g, ' '), body }))
      .filter(({ selector }) => selector.includes('arts-lightbox-blink__layer'))
      .filter(({ selector }) => selector.includes('svg'))

    expect(blocked.length).toBeGreaterThan(0)
    expect(blocked.some(({ body }) => body.includes('display: block'))).toBe(true)
  })

  it('keeps decoration over the slides from stealing the pointer', () => {
    // The preloader is an invisible box across the top of every slide and the
    // counter floats over one corner. Neither is clickable, and while either
    // could be hovered the OS cursor blinked back mid-glyph.
    const inert = rulesTouching(css, ['pointer-events'])
      .filter(({ body }) => body.includes('pointer-events: none'))
      .map(({ selector }) => selector)

    expect(inert.some((s) => s.includes('pswp__preloader'))).toBe(true)
    expect(inert.some((s) => s.includes('arts-lightbox-counter'))).toBe(true)
  })

  it('makes a closing lightbox inert, chrome included', () => {
    // Hovering the departing slide still offered a zoom, and a click could
    // still reach chrome on its way out. The `*` matters: the vendored
    // stylesheet hands `pointer-events: auto` back to the bar's children,
    // so the root alone would not settle it.
    const inert = rulesTouching(css, ['pointer-events']).filter(({ selector }) =>
      selector.includes('arts-lightbox-closing')
    )
    expect(inert.length).toBeGreaterThan(0)
    expect(inert[0]?.selector).toContain('*')
    expect(inert[0]?.body).toContain('pointer-events: none !important')
  })

  it('says what the pointer can do: zoom, grab, or nothing', () => {
    // The whole native vocabulary in one place, in cascade order — grabbing
    // has to come last, since a press over a zoomable image must beat the
    // zoom cursor rather than argue with it.
    // Ours only: the vendored stylesheet ships its own grab/grabbing pair for
    // PhotoSwipe's pan-while-zoomed model, which is not the model we run.
    const cursors = rulesTouching(css, ['cursor'])
      .map(({ selector, body }) => ({ selector: selector.replace(/\s+/g, ' '), body }))
      .filter(({ selector }) => selector.includes('arts-lightbox-'))

    const grab = cursors.find(({ body }) => body.includes('cursor: grab;'))
    const grabbing = cursors.find(({ body }) => body.includes('cursor: grabbing'))
    // Only where a drag leads somewhere, never on a single-slide gallery.
    expect(grab?.selector).toContain('arts-lightbox-draggable')
    expect(grabbing?.selector).toContain('arts-lightbox-pressing')

    const order = cursors.map(({ body }) => body)
    expect(order.findIndex((b) => b.includes('grabbing'))).toBeGreaterThan(
      order.findIndex((b) => b.includes('zoom-out'))
    )
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
