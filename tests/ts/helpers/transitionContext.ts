import { mergeOptions } from '@ts/core/mergeOptions'
import type {
  IBackdrop,
  IFlightLayer,
  IFlightSource,
  IGallery,
  IOptions,
  ISlideData,
  ITransitionContext
} from '@ts/interfaces'
import type PhotoSwipe from '@ts/photoswipe/photoswipe'
import type { TDeepPartial } from '@ts/types/TDeepPartial'
import { vi } from 'vitest'

/**
 * `ITransitionContext` is a plain object literal, so both choreographies can
 * be driven directly without `createTransitionContext`'s geometry reads —
 * the seam `mountChrome.dom.test.ts` already relies on.
 *
 * Every collaborator is a `vi.fn()`, which is the point: the choreographies
 * are ordering machines, and `mock.invocationCallOrder` is how "the flight
 * mounts before the source hides" becomes an assertion.
 */

export type TFlightSpy = { [K in keyof IFlightLayer]: ReturnType<typeof vi.fn> }
export type TBackdropSpy = { [K in keyof IBackdrop]: ReturnType<typeof vi.fn> }

export function flightSpy(): TFlightSpy {
  return {
    mount: vi.fn(),
    paint: vi.fn(),
    upgrade: vi.fn(),
    arrive: vi.fn(),
    leave: vi.fn(),
    detach: vi.fn(),
    unmount: vi.fn(),
    unmountLater: vi.fn()
  }
}

export function backdropSpy(): TBackdropSpy {
  return { paint: vi.fn(), beginClose: vi.fn(), destroy: vi.fn() }
}

/**
 * happy-dom has no layout, so every `getBoundingClientRect()` is zeroed and
 * anything gated on geometry (`findCloseSource`'s visibility test,
 * `captureFlightSource`'s overscan measurement) takes its degenerate branch.
 * Stamping a rect on the element is what makes the real branch reachable.
 */
export function giveRect(
  el: Element,
  rect: { x?: number; y?: number; width?: number; height?: number } = {}
): void {
  const x = rect.x ?? 100
  const y = rect.y ?? 100
  const width = rect.width ?? 300
  const height = rect.height ?? 200
  const box = {
    x,
    y,
    width,
    height,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
    toJSON: () => ({})
  } as DOMRect
  el.getBoundingClientRect = (): DOMRect => box
}

/** A slide PhotoSwipe has actually placed — `currentSlideTarget` needs all four. */
export function placedSlide(over: Partial<Record<string, unknown>> = {}) {
  return {
    width: 800,
    height: 600,
    currZoomLevel: 1,
    pan: { x: 40, y: 30 },
    content: { element: null },
    ...over
  }
}

export interface ITransitionCtxOptions {
  /** Slide records the request points into. Defaults to one image slide. */
  slides?: ISlideData[]
  index?: number
  /** `false` builds a source with no `src` — the coverless branch. */
  sourceSrc?: string | false
  /** `null` leaves `pswp.currSlide` unset — nothing placed, nothing flies. */
  slide?: ReturnType<typeof placedSlide> | null
  options?: TDeepPartial<IOptions>
}

/**
 * Builds a context plus the pieces a test needs to assert on. The pswp root
 * is appended to `document.body` so class and custom-property writes are
 * observable, and carries a real `.pswp__container` for the fade branch.
 */
export function transitionContext(o: ITransitionCtxOptions = {}): {
  ctx: ITransitionContext
  root: HTMLElement
  container: HTMLElement
  flight: TFlightSpy
  backdrop: TBackdropSpy
  hidden: { hide: ReturnType<typeof vi.fn>; hideAfterFrames: ReturnType<typeof vi.fn> }
  destroy: ReturnType<typeof vi.fn>
  sourceElement: HTMLElement
  pswp: { currSlide: unknown; currIndex: number; element: HTMLElement }
} {
  const slides: ISlideData[] = o.slides ?? [
    { key: 'a', type: 'image', src: '/full-a.jpg', width: 1600, height: 1200 }
  ]
  const index = o.index ?? 0

  const root = document.createElement('div')
  root.className = 'pswp'
  const container = document.createElement('div')
  container.className = 'pswp__container'
  root.appendChild(container)
  document.body.appendChild(root)

  const sourceElement = document.createElement('a')
  document.body.appendChild(sourceElement)

  const flight = flightSpy()
  const backdrop = backdropSpy()
  const hidden = { hide: vi.fn(), hideAfterFrames: vi.fn() }
  const destroy = vi.fn()

  const openSource: IFlightSource = {
    rect: { x: 10, y: 20, w: 300, h: 200 },
    radius: 4,
    innerHeightPct: 100,
    innerOffsetYPct: 0,
    src: o.sourceSrc === false ? '' : (o.sourceSrc ?? '/thumb-a.jpg')
  }

  const gallery: IGallery = {
    id: 'g',
    slides,
    elementsByKey: new Map([[slides[index]?.key ?? 'a', [sourceElement]]])
  }

  const pswp = {
    element: root,
    currSlide: o.slide === null ? undefined : (o.slide ?? placedSlide()),
    currIndex: index,
    destroy,
    on: vi.fn(),
    dispatch: vi.fn()
  }

  const ctx = {
    pswp: pswp as unknown as PhotoSwipe,
    opts: mergeOptions(o.options),
    req: { gallery, index, sourceElement },
    flight: flight as unknown as IFlightLayer,
    backdrop: backdrop as unknown as { current: IBackdrop | null },
    hidden,
    openSource
  } as unknown as ITransitionContext

  // `backdrop` on the context is the mutable ref, not the backdrop itself —
  // the close nulls `current` and the test asserts on that.
  ctx.backdrop = { current: backdrop as unknown as IBackdrop }

  return {
    ctx,
    root,
    container,
    flight,
    backdrop,
    hidden,
    destroy,
    sourceElement,
    pswp: pswp as unknown as {
      currSlide: unknown
      currIndex: number
      element: HTMLElement
    }
  }
}
