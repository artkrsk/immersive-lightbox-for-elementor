type THandler = (e: never) => void

interface IUiElementData {
  name?: string
  className?: string
  html?: string
  isButton?: boolean
  tagName?: keyof HTMLElementTagNameMap
  appendTo?: 'bar' | 'wrapper' | 'root'
  order?: number
  onInit?: (element: HTMLElement, pswp: unknown) => void
  onClick?: (e: MouseEvent, element: HTMLElement, pswp: unknown) => void
}

/** The slice of the pswp surface the engine modules actually touch. */
export function fakePswp() {
  const handlers = new Map<string, THandler[]>()
  const registeredUiElements: { data: IUiElementData; element: HTMLElement }[] = []
  const pswp = {
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
    potentialIndex: 0,
    canLoop: () => false,
    /**
     * Enough of the scroller for position-projected chrome to read. `x` and
     * `currSlideX` are set independently so a test can place the gallery
     * mid-transition — their difference is the fractional offset.
     */
    mainScroll: {
      itemHolders: [] as { slide?: unknown }[],
      x: 0,
      currSlideX: 0,
      slideWidth: 1000,
      getCurrSlideX(): number {
        return this.currSlideX
      }
    },
    currSlide: undefined as unknown,
    /** The pswp root, when a test needs its state classes read. */
    element: null as HTMLElement | null,
    /** Registered chrome in registration order — throws rather than hand back undefined. */
    uiElementAt(index: number): HTMLElement {
      const entry = registeredUiElements[index]
      if (!entry) {
        throw new Error(`no UI element registered at index ${index}`)
      }
      return entry.element
    },
    ui: {
      /**
       * Builds the element the way the fork's UIElement does — className,
       * innerHTML, synchronous onInit, onClick as a real listener. The
       * `pswp__*` prefixes and title/aria wiring are left out: nothing we
       * register uses them, and no stylesheet of ours targets them.
       */
      registerElement(data: IUiElementData): HTMLElement {
        const element = document.createElement(data.tagName ?? (data.isButton ? 'button' : 'div'))
        if (data.className) {
          element.className = data.className
        }
        if (data.html) {
          element.innerHTML = data.html
        }
        data.onInit?.(element, pswp)
        if (data.onClick) {
          element.addEventListener('click', (e: Event) => {
            data.onClick?.(e as MouseEvent, element, pswp)
          })
        }
        registeredUiElements.push({ data, element })
        return element
      }
    }
  }
  return pswp
}
