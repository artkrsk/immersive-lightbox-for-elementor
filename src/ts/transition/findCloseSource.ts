import type { IOpenRequest } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe'

const CLIPS = /hidden|clip|scroll|auto/

/**
 * How much of a landing box the page's own clipping may eat before the
 * flight refuses it. The flight paints UNCLIPPED in viewport space, so
 * landing on a half-clipped carousel clone would show the whole image over
 * the clip edge and pop the hidden half away at unmount. Near-full only.
 */
const CLIP_BAR = 0.9

/**
 * How much of the box must be inside the viewport. Deliberately lower than
 * the clip bar: a flight toward a thumb half below the fold renders
 * correctly — the viewport clips the flight and the thumb identically, so
 * nothing pops. It only has to be visibly a place on screen.
 */
const SCREEN_BAR = 0.25

/**
 * Geometric visibility of a candidate box: the fraction surviving every
 * clipping ancestor, and the fraction of it inside the viewport. Geometry
 * ONLY, on purpose — the open hides its source via `visibility: hidden`
 * (hiddenSources) and the close must keep landing on that rect, so a
 * style-based visibility test would break the designed choreography.
 */
function visibility(el: HTMLElement): { clipped: number; onScreen: number } {
  const rect = el.getBoundingClientRect()
  const area = rect.width * rect.height
  if (!area) {
    return { clipped: 0, onScreen: 0 }
  }
  let left = rect.left
  let top = rect.top
  let right = rect.right
  let bottom = rect.bottom
  for (let node = el.parentElement; node; node = node.parentElement) {
    if (CLIPS.test(getComputedStyle(node).overflow)) {
      const box = node.getBoundingClientRect()
      left = Math.max(left, box.left)
      top = Math.max(top, box.top)
      right = Math.min(right, box.right)
      bottom = Math.min(bottom, box.bottom)
      if (right <= left || bottom <= top) {
        return { clipped: 0, onScreen: 0 }
      }
    }
  }
  const clipped = ((right - left) * (bottom - top)) / area
  const screenRight = Math.min(right, window.innerWidth)
  const screenBottom = Math.min(bottom, window.innerHeight)
  const screenLeft = Math.max(left, 0)
  const screenTop = Math.max(top, 0)
  const onScreen =
    screenRight > screenLeft && screenBottom > screenTop
      ? ((screenRight - screenLeft) * (screenBottom - screenTop)) / area
      : 0
  return { clipped, onScreen }
}

function qualifies(v: { clipped: number; onScreen: number }): boolean {
  return v.clipped >= CLIP_BAR && v.onScreen >= SCREEN_BAR
}

/**
 * The element the return flight lands on — or null, which routes the close
 * to the coverless fade instead. The rule: a flight may only land on a box
 * the user can currently see. A vertical band test is not that — a carousel
 * clone translated out of its overflow window sits in the same band and
 * "landed" a viewport off screen.
 *
 * The element the user opened from wins while it qualifies (several clones
 * can be on screen at once — landing on a sibling while the original sits
 * hidden reads as closing "to the wrong image"). Otherwise the most visible
 * qualifying instance of the current slide's key: with Swiper-style loop
 * duplicates, the clone inside the window beats earlier-in-DOM clones
 * parked on the flanks.
 */
export function findCloseSource(pswp: PhotoSwipe, req: IOpenRequest): HTMLElement | null {
  const key = req.gallery.slides[pswp.currIndex]?.key
  if (!key) {
    return null
  }
  const instances = req.gallery.elementsByKey.get(key) ?? []
  const original = req.sourceElement
  if (instances.includes(original) && original.isConnected && qualifies(visibility(original))) {
    return original
  }
  let best: HTMLElement | null = null
  let bestOnScreen = 0
  for (const el of instances) {
    if (!el.isConnected) {
      continue
    }
    const v = visibility(el)
    if (qualifies(v) && v.onScreen > bestOnScreen) {
      best = el
      bestOnScreen = v.onScreen
    }
  }
  return best
}
