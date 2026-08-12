import CSSAnimation from './css-animation.js';
import SpringAnimation from './spring-animation.js';
import type { CssAnimationProps } from './css-animation.js';
import type { SpringAnimationProps } from './spring-animation.js';

export interface SharedAnimationProps {
  name?: string;
  isPan?: boolean;
  isMainScroll?: boolean;
  onComplete?: VoidFunction;
  onFinish?: VoidFunction;
}

export type Animation = SpringAnimation | CSSAnimation;

export type AnimationProps = SpringAnimationProps | CssAnimationProps;

/**
 * Manages animations
 */
class Animations {
  declare activeAnimations: Animation[];

  constructor() {
    this.activeAnimations = [];
  }

  startSpring(props: SpringAnimationProps): void {
    this._start(props, true);
  }

  startTransition(props: CssAnimationProps): void {
    this._start(props);
  }

  private _start(props: AnimationProps, isSpring?: boolean): Animation {
    const animation = isSpring
      ? new SpringAnimation(props as SpringAnimationProps)
      : new CSSAnimation(props as CssAnimationProps);

    this.activeAnimations.push(animation);
    animation.onFinish = () => this.stop(animation);

    return animation;
  }

  stop(animation: Animation): void {
    animation.destroy();
    const index = this.activeAnimations.indexOf(animation);
    if (index > -1) {
      this.activeAnimations.splice(index, 1);
    }
  }

  stopAll(): void { // _stopAllAnimations
    this.activeAnimations.forEach((animation) => {
      animation.destroy();
    });
    this.activeAnimations = [];
  }

  /**
   * Stop all pan or zoom transitions
   */
  stopAllPan(): void {
    this.activeAnimations = this.activeAnimations.filter((animation) => {
      if (animation.props.isPan) {
        animation.destroy();
        return false;
      }

      return true;
    });
  }

  stopMainScroll(): void {
    this.activeAnimations = this.activeAnimations.filter((animation) => {
      if (animation.props.isMainScroll) {
        animation.destroy();
        return false;
      }

      return true;
    });
  }

  /**
   * Returns true if main scroll transition is running
   */
  // isMainScrollRunning() {
  //   return this.activeAnimations.some((animation) => {
  //     return animation.props.isMainScroll;
  //   });
  // }

  /**
   * Returns true if any pan or zoom transition is running
   */
  isPanRunning(): boolean {
    return this.activeAnimations.some((animation) => {
      return animation.props.isPan;
    });
  }
}

export default Animations;
