import { curvedEdgePath, DEFAULT_POINTS, straightInset, type TCurtainDirection } from './curve'

export interface ICurtainMaskOptions {
  /** Hosts the injected `<svg><defs><clipPath>` (component root). */
  host: HTMLElement
  /** Unique per instance — multiple masks per page must not collide. */
  id: string
  /** Edge the revealed region grows from. Default 'right'. */
  direction?: TCurtainDirection
  /** 'curved' clips via the injected SVG path (normalized coords — zero
   *  layout reads); 'straight' writes an inline inset() basic shape
   *  (faster paint path, the bow-0 degenerate case). Default 'curved'. */
  edgeStyle?: 'curved' | 'straight'
  /** Sampled points along the curved leading edge. */
  points?: number
}

const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * Vendored from @arts/curtain-mask (same author).
 *
 * Progress-driven bowed-edge clip mask. Pure mechanics: defs ownership,
 * target attachment, dirty-checked paint. Consumers own ALL policy —
 * what to attach, when, and where `t`/`bow` come from (per-frame engine
 * reads or tweened proxies; the module stays animation-library-free).
 */
export class CurtainMask {
  private readonly host: HTMLElement
  private readonly id: string
  private readonly edgeStyle: 'curved' | 'straight'
  private readonly points: number
  private direction: TCurtainDirection
  private svgEl: SVGSVGElement | null = null
  private pathEl: SVGPathElement | null = null
  private attached: HTMLElement | null = null
  private lastT = -1
  private lastBow = 0

  constructor(options: ICurtainMaskOptions) {
    this.host = options.host
    this.id = options.id
    this.direction = options.direction ?? 'right'
    this.edgeStyle = options.edgeStyle ?? 'curved'
    this.points = options.points ?? DEFAULT_POINTS

    // Normalized clipPath defs — objectBoundingBox units mean the curve
    // math never reads layout. Injected per instance; `d` is the only
    // thing that mutates per frame. WebKit only honors INLINE clipPath
    // references, which is exactly this shape.
    this.svgEl = document.createElementNS(SVG_NS, 'svg')
    this.svgEl.setAttribute('width', '0')
    this.svgEl.setAttribute('height', '0')
    this.svgEl.setAttribute('aria-hidden', 'true')
    this.svgEl.style.position = 'absolute'
    const defs = document.createElementNS(SVG_NS, 'defs')
    const clipPath = document.createElementNS(SVG_NS, 'clipPath')
    clipPath.setAttribute('id', this.id)
    clipPath.setAttribute('clipPathUnits', 'objectBoundingBox')
    this.pathEl = document.createElementNS(SVG_NS, 'path')
    clipPath.appendChild(this.pathEl)
    defs.appendChild(clipPath)
    this.svgEl.appendChild(defs)
    this.host.appendChild(this.svgEl)
  }

  /** Point the clip at an element. Curved mode assigns the url()
   *  reference once here — per-frame work stays the `<path d>` mutation.
   *  Straight mode just remembers the target (inset writes per paint). */
  public attach(el: HTMLElement): void {
    if (this.attached && this.attached !== el) {
      this.attached.style.clipPath = ''
    }
    this.attached = el
    if (this.edgeStyle === 'curved') {
      el.style.clipPath = `url(#${this.id})`
    }
    this.invalidate()
  }

  /** Release the current target (steady states carry no clip). */
  public detach(): void {
    if (this.attached) {
      this.attached.style.clipPath = ''
      this.attached = null
    }
  }

  /** Paint the reveal at `t` with an optional signed bow. Dirty-checked —
   *  repeat frames with identical values are no-ops. */
  public setProgress(t: number, bow = 0): void {
    if (t === this.lastT && bow === this.lastBow) {
      return
    }
    this.lastT = t
    this.lastBow = bow
    if (this.edgeStyle === 'curved') {
      this.pathEl?.setAttribute('d', curvedEdgePath(t, bow, this.direction, this.points))
    } else if (this.attached) {
      this.attached.style.clipPath = straightInset(t, this.direction)
    }
  }

  /** Re-point the reveal origin (e.g. a close that hides toward the
   *  opposite edge). Invalidates the dirty cache. */
  public setDirection(direction: TCurtainDirection): void {
    if (this.direction === direction) {
      return
    }
    this.direction = direction
    this.invalidate()
  }

  /** Detach + remove the injected defs (HMR revert). */
  public revert(): void {
    this.detach()
    this.svgEl?.remove()
    this.svgEl = null
    this.pathEl = null
  }

  private invalidate(): void {
    this.lastT = -1
    this.lastBow = 0
  }
}
