const DEFAULT_NATURAL_FREQUENCY = 12
const DEFAULT_DAMPING_RATIO = 0.75

/**
 * Spring easing helper
 */
class SpringEaser {
  /* `declare` fields erase completely — constructor-assigned like upstream,
     so the emitted JS (and own-property semantics) stay byte-identical. */
  declare velocity: number
  private declare _dampingRatio: number
  private declare _naturalFrequency: number
  private declare _dampedFrequency: number

  /**
   * @param initialVelocity Initial velocity, px per ms.
   *
   * @param dampingRatio
   * Determines how bouncy animation will be.
   * From 0 to 1, 0 - always overshoot, 1 - do not overshoot.
   * "overshoot" refers to part of animation that
   * goes beyond the final value.
   *
   * @param naturalFrequency
   * Determines how fast animation will slow down.
   * The higher value - the stiffer the transition will be,
   * and the faster it will slow down.
   * Recommended value from 10 to 50
   */
  constructor(initialVelocity: number, dampingRatio?: number, naturalFrequency?: number) {
    this.velocity = initialVelocity * 1000 // convert to "pixels per second"

    // https://en.wikipedia.org/wiki/Damping_ratio
    this._dampingRatio = dampingRatio || DEFAULT_DAMPING_RATIO

    // https://en.wikipedia.org/wiki/Natural_frequency
    this._naturalFrequency = naturalFrequency || DEFAULT_NATURAL_FREQUENCY

    this._dampedFrequency = this._naturalFrequency

    if (this._dampingRatio < 1) {
      this._dampedFrequency *= Math.sqrt(1 - this._dampingRatio * this._dampingRatio)
    }
  }

  /**
   * @param deltaPosition Difference between current and end position of the animation
   * @param deltaTime Frame duration in milliseconds
   *
   * @returns Displacement, relative to the end position.
   */
  easeFrame(deltaPosition: number, deltaTime: number): number {
    // Inspired by Apple Webkit and Android spring function implementation
    // https://en.wikipedia.org/wiki/Oscillation
    // https://en.wikipedia.org/wiki/Damping_ratio
    // we ignore mass (assume that it's 1kg)

    let displacement = 0
    let coeff

    deltaTime /= 1000

    const naturalDumpingPow = Math.E ** (-this._dampingRatio * this._naturalFrequency * deltaTime)

    if (this._dampingRatio === 1) {
      coeff = this.velocity + this._naturalFrequency * deltaPosition

      displacement = (deltaPosition + coeff * deltaTime) * naturalDumpingPow

      this.velocity = displacement * -this._naturalFrequency + coeff * naturalDumpingPow
    } else if (this._dampingRatio < 1) {
      coeff =
        (1 / this._dampedFrequency) *
        (this._dampingRatio * this._naturalFrequency * deltaPosition + this.velocity)

      const dumpedFCos = Math.cos(this._dampedFrequency * deltaTime)
      const dumpedFSin = Math.sin(this._dampedFrequency * deltaTime)

      displacement = naturalDumpingPow * (deltaPosition * dumpedFCos + coeff * dumpedFSin)

      this.velocity =
        displacement * -this._naturalFrequency * this._dampingRatio +
        naturalDumpingPow *
          (-this._dampedFrequency * deltaPosition * dumpedFSin +
            this._dampedFrequency * coeff * dumpedFCos)
    }

    // Overdamped (>1) damping ratio is not supported

    return displacement
  }
}

export default SpringEaser
