import {
  equalizePoints, getDistanceBetween, clamp, pointsEqual
} from '../util/util';
import type Gestures from './gestures';
import type { Point } from '../types';

const UPPER_ZOOM_FRICTION = 0.05;
const LOWER_ZOOM_FRICTION = 0.15;


/**
 * Get center point between two points
 */
function getZoomPointsCenter(p: Point, p1: Point, p2: Point): Point {
  p.x = (p1.x + p2.x) / 2;
  p.y = (p1.y + p2.y) / 2;
  return p;
}

class ZoomHandler {
  declare gestures: Gestures;
  declare private _startPan: Point;
  declare private _startZoomPoint: Point;
  declare private _zoomPoint: Point;
  declare private _wasOverFitZoomLevel: boolean;
  declare private _startZoomLevel: number;

  constructor(gestures: Gestures) {
    this.gestures = gestures;
    this._startPan = { x: 0, y: 0 };
    this._startZoomPoint = { x: 0, y: 0 };
    this._zoomPoint = { x: 0, y: 0 };
    this._wasOverFitZoomLevel = false;
    this._startZoomLevel = 1;
  }

  start(): void {
    const { currSlide } = this.gestures.pswp;
    if (currSlide) {
      this._startZoomLevel = currSlide.currZoomLevel;
      equalizePoints(this._startPan, currSlide.pan);
    }

    this.gestures.pswp.animations.stopAllPan();
    this._wasOverFitZoomLevel = false;
  }

  change(): void {
    const { p1, startP1, p2, startP2, pswp } = this.gestures;
    const { currSlide } = pswp;

    if (!currSlide) {
      return;
    }

    const minZoomLevel = currSlide.zoomLevels.min;
    const maxZoomLevel = currSlide.zoomLevels.max;

    if (!currSlide.isZoomable() || pswp.mainScroll.isShifted()) {
      return;
    }

    getZoomPointsCenter(this._startZoomPoint, startP1, startP2);
    getZoomPointsCenter(this._zoomPoint, p1, p2);

    let currZoomLevel = (1 / getDistanceBetween(startP1, startP2))
                      * getDistanceBetween(p1, p2)
                      * this._startZoomLevel;

    // slightly over the zoom.fit
    if (currZoomLevel > currSlide.zoomLevels.initial + (currSlide.zoomLevels.initial / 15)) {
      this._wasOverFitZoomLevel = true;
    }

    if (currZoomLevel < minZoomLevel) {
      if (pswp.options.pinchToClose
          && !this._wasOverFitZoomLevel
          && this._startZoomLevel <= currSlide.zoomLevels.initial) {
        // fade out background if zooming out
        const bgOpacity = 1 - ((minZoomLevel - currZoomLevel) / (minZoomLevel / 1.2));
        if (!pswp.dispatch('pinchClose', { bgOpacity }).defaultPrevented) {
          pswp.applyBgOpacity(bgOpacity);
        }
      } else {
        // Apply the friction if zoom level is below the min
        currZoomLevel = minZoomLevel - (minZoomLevel - currZoomLevel) * LOWER_ZOOM_FRICTION;
      }
    } else if (currZoomLevel > maxZoomLevel) {
      // Apply the friction if zoom level is above the max
      currZoomLevel = maxZoomLevel + (currZoomLevel - maxZoomLevel) * UPPER_ZOOM_FRICTION;
    }

    currSlide.pan.x = this._calculatePanForZoomLevel('x', currZoomLevel);
    currSlide.pan.y = this._calculatePanForZoomLevel('y', currZoomLevel);

    currSlide.setZoomLevel(currZoomLevel);
    currSlide.applyCurrentZoomPan();
  }

  end(): void {
    const { pswp } = this.gestures;
    const { currSlide } = pswp;
    if ((!currSlide || currSlide.currZoomLevel < currSlide.zoomLevels.initial)
        && !this._wasOverFitZoomLevel
        && pswp.options.pinchToClose) {
      pswp.close();
    } else {
      this.correctZoomPan();
    }
  }

  private _calculatePanForZoomLevel(axis: 'x' | 'y', currZoomLevel: number): number {
    const zoomFactor = currZoomLevel / this._startZoomLevel;
    return this._zoomPoint[axis]
            - ((this._startZoomPoint[axis] - this._startPan[axis]) * zoomFactor);
  }

  /**
   * Correct currZoomLevel and pan if they are
   * beyond minimum or maximum values.
   * With animation.
   *
   * @param ignoreGesture
   * Wether gesture coordinates should be ignored when calculating destination pan position.
   */
  correctZoomPan(ignoreGesture?: boolean): void {
    const { pswp } = this.gestures;
    const { currSlide } = pswp;

    if (!currSlide?.isZoomable()) {
      return;
    }

    if (this._zoomPoint.x === 0) {
      ignoreGesture = true;
    }

    const prevZoomLevel = currSlide.currZoomLevel;

    let destinationZoomLevel: number;
    let currZoomLevelNeedsChange = true;

    if (prevZoomLevel < currSlide.zoomLevels.initial) {
      destinationZoomLevel = currSlide.zoomLevels.initial;
      // zoom to min
    } else if (prevZoomLevel > currSlide.zoomLevels.max) {
      destinationZoomLevel = currSlide.zoomLevels.max;
      // zoom to max
    } else {
      currZoomLevelNeedsChange = false;
      destinationZoomLevel = prevZoomLevel;
    }

    const initialBgOpacity = pswp.bgOpacity;
    const restoreBgOpacity = pswp.bgOpacity < 1;

    const initialPan = equalizePoints({ x: 0, y: 0 }, currSlide.pan);
    let destinationPan = equalizePoints({ x: 0, y: 0 }, initialPan);

    if (ignoreGesture) {
      this._zoomPoint.x = 0;
      this._zoomPoint.y = 0;
      this._startZoomPoint.x = 0;
      this._startZoomPoint.y = 0;
      this._startZoomLevel = prevZoomLevel;
      equalizePoints(this._startPan, initialPan);
    }

    if (currZoomLevelNeedsChange) {
      destinationPan = {
        x: this._calculatePanForZoomLevel('x', destinationZoomLevel),
        y: this._calculatePanForZoomLevel('y', destinationZoomLevel)
      };
    }

    // set zoom level, so pan bounds are updated according to it
    currSlide.setZoomLevel(destinationZoomLevel);

    destinationPan = {
      x: currSlide.bounds.correctPan('x', destinationPan.x),
      y: currSlide.bounds.correctPan('y', destinationPan.y)
    };

    // return zoom level and its bounds to initial
    currSlide.setZoomLevel(prevZoomLevel);

    const panNeedsChange = !pointsEqual(destinationPan, initialPan);

    if (!panNeedsChange && !currZoomLevelNeedsChange && !restoreBgOpacity) {
      // update resolution after gesture
      currSlide._setResolution(destinationZoomLevel);
      currSlide.applyCurrentZoomPan();

      // nothing to animate
      return;
    }

    pswp.animations.stopAllPan();

    pswp.animations.startSpring({
      isPan: true,
      start: 0,
      end: 1000,
      velocity: 0,
      dampingRatio: 1,
      naturalFrequency: 40,
      onUpdate: (now) => {
        now /= 1000; // 0 - start, 1 - end

        if (panNeedsChange || currZoomLevelNeedsChange) {
          if (panNeedsChange) {
            currSlide.pan.x = initialPan.x + (destinationPan.x - initialPan.x) * now;
            currSlide.pan.y = initialPan.y + (destinationPan.y - initialPan.y) * now;
          }

          if (currZoomLevelNeedsChange) {
            const newZoomLevel = prevZoomLevel
                        + (destinationZoomLevel - prevZoomLevel) * now;
            currSlide.setZoomLevel(newZoomLevel);
          }

          currSlide.applyCurrentZoomPan();
        }

        // Restore background opacity
        if (restoreBgOpacity && pswp.bgOpacity < 1) {
          // We clamp opacity to keep it between 0 and 1.
          // As progress ratio can be larger than 1 due to overshoot,
          // and we do not want to bounce opacity.
          pswp.applyBgOpacity(clamp(
            initialBgOpacity + (1 - initialBgOpacity) * now, 0, 1
          ));
        }
      },
      onComplete: () => {
        // update resolution after transition ends
        currSlide._setResolution(destinationZoomLevel);
        currSlide.applyCurrentZoomPan();
      }
    });
  }
}

export default ZoomHandler;
