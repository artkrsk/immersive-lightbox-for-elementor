import type { TGateBoot } from './TGateBoot'

/** A module host captures the gate lifetime before its dynamic import starts. */
export type TLightboxGateOptions = Omit<TGateBoot, 'js'> &
  ({ js: string; load?: never } | { js?: never; load(signal: AbortSignal): Promise<void> })
