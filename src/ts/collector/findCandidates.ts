import { ATTR_GROUP, ATTR_OFF, CANDIDATE_SELECTOR } from '../constants'
import type { ICandidate } from '../interfaces'
import { extractSlideData } from './extractSlideData'

function resolveGroupId(el: HTMLElement): string | null {
  return (
    el.getAttribute(ATTR_GROUP) ?? el.closest(`[${ATTR_GROUP}]`)?.getAttribute(ATTR_GROUP) ?? null
  )
}

/** All openable elements under `root`, in DOM order, opt-outs excluded. */
export function findCandidates(root: ParentNode): ICandidate[] {
  const elements = [...root.querySelectorAll<HTMLElement>(CANDIDATE_SELECTOR)]
  return elements
    .filter((el) => !el.closest(`[${ATTR_OFF}]`))
    .map((el) => ({
      element: el,
      data: extractSlideData(el),
      groupId: resolveGroupId(el)
    }))
}
