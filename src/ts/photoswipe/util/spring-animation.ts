import SpringEaser from './spring-easer.js';
import type { SharedAnimationProps } from './animations.js';

export interface DefaultSpringAnimationProps {
  start: number;
  end: number;
  velocity: number;
  dampingRatio?: number;
  naturalFrequency?: number;
  onUpdate: (end: number) => void;
}

export type SpringAnimationProps = SharedAnimationProps & DefaultSpringAnimationProps;

class SpringAnimation {
  declare props: SpringAnimationProps;
  declare onFinish: () => void;
  declare private _raf: number;

  constructor(props: SpringAnimationProps) {
    this.props = props;
    this._raf = 0;

    const {
      start,
      end,
      velocity,
      onUpdate,
      onComplete,
      onFinish = () => {},
      dampingRatio,
      naturalFrequency
    } = props;

    this.onFinish = onFinish;

    const easer = new SpringEaser(velocity, dampingRatio, naturalFrequency);
    let prevTime = Date.now();
    let deltaPosition = start - end;

    const animationLoop = () => {
      if (this._raf) {
        deltaPosition = easer.easeFrame(deltaPosition, Date.now() - prevTime);

        // Stop the animation if velocity is low and position is close to end
        if (Math.abs(deltaPosition) < 1 && Math.abs(easer.velocity) < 50) {
          // Finalize the animation
          onUpdate(end);
          if (onComplete) {
            onComplete();
          }
          this.onFinish();
        } else {
          prevTime = Date.now();
          onUpdate(deltaPosition + end);
          this._raf = requestAnimationFrame(animationLoop);
        }
      }
    };

    this._raf = requestAnimationFrame(animationLoop);
  }

  // Destroy is called automatically onFinish
  destroy(): void {
    if (this._raf >= 0) {
      cancelAnimationFrame(this._raf);
    }
    this._raf = 0;
  }
}

export default SpringAnimation;
