type THandler = (e: never) => void

/** The slice of the pswp surface the engine modules actually touch. */
export function fakePswp() {
  const handlers = new Map<string, THandler[]>()
  return {
    currIndex: 0,
    on(name: string, fn: THandler) {
      const list = handlers.get(name) ?? []
      list.push(fn)
      handlers.set(name, list)
    },
    addFilter(_name: string, _fn: unknown) {},
    emit(name: string, e: unknown) {
      for (const fn of handlers.get(name) ?? []) {
        fn(e as never)
      }
    },
    mainScroll: { itemHolders: [] as { slide?: unknown }[] },
    currSlide: undefined as unknown
  }
}
