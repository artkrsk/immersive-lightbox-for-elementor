import { measureFlightAxis } from '@ts/transition/measureFlightAxis'
import { describe, expect, it } from 'vitest'

describe('measureFlightAxis', () => {
  it('returns media size and offset percentages relative to the frame', () => {
    expect(measureFlightAxis(70, 360, 100, 300)).toEqual([120, -10])
  })

  it('keeps the neutral geometry when either size is unavailable', () => {
    expect(measureFlightAxis(70, 0, 100, 300)).toEqual([100, 0])
    expect(measureFlightAxis(70, 360, 100, 0)).toEqual([100, 0])
  })
})
