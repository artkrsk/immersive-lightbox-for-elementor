/// <reference path="./contract/events.d.ts" />
import type { ElementorFrontend } from '@artemsemkin/elementor-types'
import type { IArtsLightboxGlobal } from './interfaces/IArtsLightboxGlobal'
import type { IOptions } from './interfaces/IOptions'
import type { TDeepPartial } from './types/TDeepPartial'
import type { TGateBoot } from './types/TGateBoot'

/**
 * Consumer-facing discovery contract. Ambient names deliberately keep their
 * built-in casing — prefixing would break TS declaration merging.
 */
declare global {
  interface Window {
    artsLightbox?: IArtsLightboxGlobal
    /** Read once by boot.ts. Absent outside WordPress. */
    artsImmersiveLightboxOptions?: TDeepPartial<IOptions>
    /** Read by gate.ts at parse and load time. Absent outside WordPress. */
    artsImmersiveLightboxBoot?: TGateBoot
    /**
     * Arts Cursor Follower's discovery global, when that plugin is present.
     * Structural minimum of what markCandidates nudges — no dependency.
     */
    artsCursor?: { get(): { refresh?(): void } | null }
    /** WooCommerce's own jQuery event for a replaced variation gallery. */
    jQuery?: (target: Document) => {
      on(events: string, selector: string, handler: () => void): void
      off?(events: string, selector: string, handler: () => void): void
    }
    /**
     * Elementor's frontend global, in both the preview iframe and the front
     * end. Absent until Elementor's init builds it.
     */
    elementorFrontend?: ElementorFrontend
  }
}
