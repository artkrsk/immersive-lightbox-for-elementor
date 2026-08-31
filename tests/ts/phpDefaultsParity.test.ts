import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DEFAULT_OPTIONS } from '@ts/constants/defaults'
import { describe, expect, it } from 'vitest'

/**
 * The cross-language invariant nothing else can catch: Options::build() is
 * the load path (PHP prints the final options into the page) and defaults.ts
 * is what a kit-less host resolves to — the same values, stated twice, in
 * two languages sharing no build step. A default drifting on one side only
 * would ship as "WordPress disagrees with everywhere else".
 *
 * `elementor.nativeFallback` is deliberately NOT here: PHP always computes
 * it fresh from the kit, and the TS `false` is the honest non-WP answer
 * (no kit, no Elementor-shaped sweeping) — the two are allowed to differ.
 *
 * Parsed by regex rather than executed — booting WordPress to call one
 * static method would cost the suite a PHP runtime.
 */

const OPTIONS_PHP = readFileSync(resolve(__dirname, '../../src/php/Options.php'), 'utf8')

/** The literal fallback in a `self::is_on( 'key', <default> )` call. */
const phpSwitcherFallback = (key: string): boolean => {
  const match = OPTIONS_PHP.match(new RegExp(`is_on\\(\\s*'${key}'\\s*,\\s*(true|false)\\s*\\)`))
  if (!match?.[1]) {
    throw new Error(`no is_on() fallback found for '${key}' in Options.php`)
  }
  return match[1] === 'true'
}

/** The literal fallback in a `self::size_of( 'key', <default> )` call. */
const phpSizeFallback = (key: string): number => {
  const match = OPTIONS_PHP.match(new RegExp(`size_of\\(\\s*'${key}'\\s*,\\s*([\\d.]+)\\s*\\)`))
  if (!match?.[1]) {
    throw new Error(`no size_of() fallback found for '${key}' in Options.php`)
  }
  return Number(match[1])
}

/** The literal fallback in a `self::choice( 'key', [...], '<default>' )` call. */
const phpChoiceFallback = (key: string): string => {
  const match = OPTIONS_PHP.match(
    new RegExp(`choice\\(\\s*'${key}'\\s*,\\s*array\\([^)]*\\)\\s*,\\s*'([a-z]+)'\\s*\\)`)
  )
  if (!match?.[1]) {
    throw new Error(`no choice() fallback found for '${key}' in Options.php`)
  }
  return match[1]
}

describe('PHP and TS state the same defaults', () => {
  it('lightbox_enable_counter falls back to the engine default', () => {
    expect(phpSwitcherFallback('lightbox_enable_counter')).toBe(DEFAULT_OPTIONS.ui.counter)
  })

  it('switcher controls fall back to the engine defaults', () => {
    expect(phpSwitcherFallback('arts_lightbox_thumbnails')).toBe(DEFAULT_OPTIONS.ui.thumbnails)
    expect(phpSwitcherFallback('arts_lightbox_captions')).toBe(DEFAULT_OPTIONS.ui.captions)
    expect(phpSwitcherFallback('arts_lightbox_loop')).toBe(DEFAULT_OPTIONS.gallery.loop)
    expect(phpSwitcherFallback('arts_lightbox_unite')).toBe(DEFAULT_OPTIONS.gallery.uniteAll)
    expect(phpSwitcherFallback('arts_lightbox_wheel_zoom')).toBe(DEFAULT_OPTIONS.zoom.wheelToZoom)
    expect(phpSwitcherFallback('arts_lightbox_explore')).toBe(DEFAULT_OPTIONS.explore.enabled)
    expect(phpSwitcherFallback('arts_lightbox_video_autoplay')).toBe(DEFAULT_OPTIONS.video.autoplay)
  })

  it('slider controls fall back to the engine defaults', () => {
    expect(phpSizeFallback('arts_lightbox_duration')).toBe(DEFAULT_OPTIONS.transition.duration)
    expect(phpSizeFallback('arts_lightbox_backdrop_opacity')).toBe(
      DEFAULT_OPTIONS.ui.backdropOpacity
    )
    expect(phpSizeFallback('arts_lightbox_zoom_level')).toBe(DEFAULT_OPTIONS.zoom.level)
  })

  it('select controls fall back to the engine defaults', () => {
    expect(phpChoiceFallback('arts_lightbox_preset')).toBe(DEFAULT_OPTIONS.transition.preset)
    expect(phpChoiceFallback('arts_lightbox_edge')).toBe(DEFAULT_OPTIONS.transition.edge)
    expect(phpChoiceFallback('arts_lightbox_thumbnails_position')).toBe(
      DEFAULT_OPTIONS.ui.thumbnailsPosition
    )
    expect(phpChoiceFallback('arts_lightbox_zoom')).toBe(DEFAULT_OPTIONS.zoom.mode)
  })
})
