// Barrel carries only exports with live consumers (knip is a hard gate).
// The remaining T* types are imported directly by declaration files
// (interfaces/IOptions.ts) per the direct-import convention.
export type { TDeepPartial } from './TDeepPartial'
export type { TEasingName } from './TEasingName'
