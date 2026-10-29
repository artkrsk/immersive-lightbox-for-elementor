import { ATTR_FLY } from '../constants'
import type { IFlightExtra, IRect } from '../interfaces'

/** Inherited text properties: the clone loses its ancestors, not its look. */
const TEXT_PROPS = [
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'fontVariant',
  'lineHeight',
  'letterSpacing',
  'wordSpacing',
  'textTransform',
  'textAlign',
  'textDecoration',
  'textShadow',
  'whiteSpace',
  'direction',
  'color'
] as const

/** The box's own look; a widget-scoped stylesheet may be what painted it. */
const BOX_PROPS = [
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'borderTop',
  'borderRight',
  'borderBottom',
  'borderLeft',
  'borderRadius',
  'boxShadow',
  'boxSizing'
] as const

const BACKGROUND_PROPS = [
  'backgroundColor',
  'backgroundImage',
  'backgroundSize',
  'backgroundPosition',
  'backgroundRepeat',
  'backgroundClip',
  'backgroundOrigin'
] as const

function pick(computed: CSSStyleDeclaration, props: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {}
  const source = computed as unknown as Record<string, string | undefined>
  for (const prop of props) {
    const value = source[prop]
    if (value) {
      out[prop] = value
    }
  }
  return out
}

/**
 * The trigger's marked descendants, measured against the frame the flight
 * stands in for. A caption may sit OUTSIDE the clip box (a card's overlaid
 * caption is usually a sibling of the frame inside the anchor), so the walk
 * starts at the clicked element. Geometry only, like the inner img: the
 * clone is placed by rect, never by parsing transforms, so hover-lift's
 * shift and any other motion are captured where they left the element.
 */
export function captureFlightExtras(sourceEl: HTMLElement, frame: IRect): IFlightExtra[] {
  const hover = sourceEl.matches(':hover')
  const frameW = frame.w > 0 ? frame.w : 1
  const frameH = frame.h > 0 ? frame.h : 1
  const extras: IFlightExtra[] = []
  for (const element of sourceEl.querySelectorAll<HTMLElement>(`[${ATTR_FLY}]`)) {
    const kind = element.getAttribute(ATTR_FLY)
    if (kind !== 'veil' && kind !== 'caption') {
      continue
    }
    const rect = element.getBoundingClientRect()
    const computed = getComputedStyle(element)
    const opacity = Number.parseFloat(computed.opacity)
    extras.push({
      kind,
      element,
      x: (rect.left - frame.x) / frameW,
      y: (rect.top - frame.y) / frameH,
      w: rect.width / frameW,
      h: rect.height / frameH,
      width: rect.width,
      height: rect.height,
      hover,
      opacity: Number.isFinite(opacity) ? opacity : 1,
      styles:
        kind === 'veil'
          ? pick(computed, BACKGROUND_PROPS)
          : pick(computed, [...TEXT_PROPS, ...BOX_PROPS, ...BACKGROUND_PROPS])
    })
  }
  return extras
}
