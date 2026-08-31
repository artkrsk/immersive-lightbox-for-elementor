import type { ITransitionHandle } from '../interfaces'
import type PhotoSwipe from '../photoswipe/photoswipe'

/**
 * Engine-level persistence. PhotoSwipe destroys its core on every close by
 * design (close → destroy, listeners wiped), so persistence lives HERE — a
 * fresh cheap pswp core is created per open and must never be reused after
 * destroy.
 */
export const engineState: {
  pswp: PhotoSwipe | null
  closeHandle: ITransitionHandle | null
} = {
  pswp: null,
  closeHandle: null
}
