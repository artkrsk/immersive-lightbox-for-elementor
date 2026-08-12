import type { IMediaState, ISoundSurface } from '../interfaces'
import { audioFocus } from '../video/audioFocus'

/**
 * Sound over an embed's player bridge. The wire protocol has no queryable
 * mute state, so `bridgeMuted` mirrors whatever was last set — including by
 * the focus-eviction callback. Null when no bridge is registered for this
 * iframe (the embed never got one, so there is nothing to control).
 */
export function bridgeSound(el: HTMLIFrameElement, state: IMediaState): ISoundSurface | null {
  const bridge = state.bridges.get(el)
  if (!bridge) {
    return null
  }
  return {
    muted: state.bridgeMuted.get(el) ?? true,
    setMuted: (muted) => {
      bridge.setMuted(muted)
      state.bridgeMuted.set(el, muted)
      if (!muted) {
        bridge.play()
        audioFocus.claim(el, () => {
          bridge.setMuted(true)
          state.bridgeMuted.set(el, true)
        })
      }
    }
  }
}
