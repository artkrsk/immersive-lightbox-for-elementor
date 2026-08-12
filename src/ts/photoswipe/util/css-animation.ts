import type { SharedAnimationProps } from './animations'
import { removeTransitionStyle, setTransitionStyle } from './util'

const DEFAULT_EASING = 'cubic-bezier(.4,0,.22,1)'

export interface DefaultCssAnimationProps {
  target: HTMLElement
  duration?: number
  easing?: string
  transform?: string
  opacity?: string
}

export type CssAnimationProps = SharedAnimationProps & DefaultCssAnimationProps

/**
 * Runs CSS transition.
 */
class CSSAnimation {
  declare props: CssAnimationProps
  declare onFinish: () => void
  private declare _target: HTMLElement
  private declare _onComplete: VoidFunction | undefined
  private declare _finished: boolean
  private declare _helperTimeout: ReturnType<typeof setTimeout>

  /**
   * onComplete can be unpredictable, be careful about current state
   */
  constructor(props: CssAnimationProps) {
    this.props = props
    const {
      target,
      onComplete,
      transform,
      onFinish = () => {},
      duration = 333,
      easing = DEFAULT_EASING
    } = props

    this.onFinish = onFinish

    // support only transform and opacity
    const prop = transform ? 'transform' : 'opacity'
    const propValue = props[prop] ?? ''

    this._target = target
    this._onComplete = onComplete
    this._finished = false

    this._onTransitionEnd = this._onTransitionEnd.bind(this)

    // Using timeout hack to make sure that animation
    // starts even if the animated property was changed recently,
    // otherwise transitionend might not fire or transition won't start.
    // https://drafts.csswg.org/css-transitions/#starting
    //
    // ¯\_(ツ)_/¯
    this._helperTimeout = setTimeout(() => {
      setTransitionStyle(target, prop, duration, easing)
      this._helperTimeout = setTimeout(() => {
        target.addEventListener('transitionend', this._onTransitionEnd, false)
        target.addEventListener('transitioncancel', this._onTransitionEnd, false)

        // Safari occasionally does not emit transitionend event
        // if element property was modified during the transition,
        // which may be caused by resize or third party component,
        // using timeout as a safety fallback
        this._helperTimeout = setTimeout(() => {
          this._finalizeAnimation()
        }, duration + 500)
        target.style[prop] = propValue
      }, 30) // Do not reduce this number
    }, 0)
  }

  private _onTransitionEnd(e: TransitionEvent): void {
    if (e.target === this._target) {
      this._finalizeAnimation()
    }
  }

  private _finalizeAnimation(): void {
    if (!this._finished) {
      this._finished = true
      this.onFinish()
      if (this._onComplete) {
        this._onComplete()
      }
    }
  }

  // Destroy is called automatically onFinish
  destroy(): void {
    if (this._helperTimeout) {
      clearTimeout(this._helperTimeout)
    }
    removeTransitionStyle(this._target)
    this._target.removeEventListener('transitionend', this._onTransitionEnd, false)
    this._target.removeEventListener('transitioncancel', this._onTransitionEnd, false)
    if (!this._finished) {
      this._finalizeAnimation()
    }
  }
}

export default CSSAnimation
