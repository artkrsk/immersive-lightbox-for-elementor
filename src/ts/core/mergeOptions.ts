import { DEFAULT_OPTIONS } from '../constants'
import type { IOptions } from '../interfaces'
import type { TDeepPartial } from '../types'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function deepMerge<T extends Record<string, unknown>>(base: T, patch: Record<string, unknown>): T {
  const out: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      continue
    }
    const current = out[key]
    if (isPlainObject(current) && isPlainObject(value)) {
      out[key] = deepMerge(current, value)
    } else {
      out[key] = value
    }
  }
  return out as T
}

/** Full options from a nested partial, layered over the defaults. */
export function mergeOptions(partial?: TDeepPartial<IOptions>): IOptions {
  if (!partial) {
    return structuredClone(DEFAULT_OPTIONS)
  }
  return deepMerge(
    structuredClone(DEFAULT_OPTIONS) as unknown as Record<string, unknown>,
    partial as Record<string, unknown>
  ) as unknown as IOptions
}
