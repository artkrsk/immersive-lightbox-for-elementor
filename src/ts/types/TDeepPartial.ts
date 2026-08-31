/** Recursive Partial for nested options objects. */
export type TDeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? TDeepPartial<T[K]> : T[K]
}
