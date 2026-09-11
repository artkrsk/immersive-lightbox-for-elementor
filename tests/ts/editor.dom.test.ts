// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from 'vitest'

interface IFakeUrlView {
  setValue(setting: string, value: string): void
  getControlValue(): Record<string, unknown> | undefined
  $el: { find(selector: string): { prop(name: string, value: boolean): void; length: number } }
  model: { get(key: string): unknown }
  container?: { settings?: { get(key: string): unknown } }
  listenTo(obj: unknown, event: string, callback: () => void): void
  onBaseInputChange(event: Event): void
  onReady(): void
}

/** `super.x()` in the subclass resolves against the PROTOTYPE, so the
 *  trackable stubs must live there too, not as per-instance fields. */
function fakeUrlClass(): {
  Url: new () => IFakeUrlView
  baseOnBaseInputChange: ReturnType<typeof vi.fn>
  baseOnReady: ReturnType<typeof vi.fn>
} {
  class FakeUrl implements IFakeUrlView {
    setValue = vi.fn()
    getControlValue = vi.fn((): Record<string, unknown> | undefined => ({}))
    $el = { find: vi.fn(() => ({ prop: vi.fn(), length: 0 })) }
    model = { get: vi.fn() }
    listenTo = vi.fn()
    onBaseInputChange(_event: Event): void {}
    onReady(): void {}
  }
  const baseOnBaseInputChange = vi.fn()
  const baseOnReady = vi.fn()
  FakeUrl.prototype.onBaseInputChange = baseOnBaseInputChange
  FakeUrl.prototype.onReady = baseOnReady
  return { Url: FakeUrl, baseOnBaseInputChange, baseOnReady }
}

/**
 * Each test re-imports the module fresh (module-level side effect), so a
 * plain `window.dispatchEvent` would accumulate a listener per test — old
 * ones never get detached by `vi.resetModules()`. Capturing the registered
 * handler and invoking it directly keeps each test isolated.
 */
async function importEditorHandler(): Promise<() => void> {
  vi.resetModules()
  let handler: (() => void) | undefined
  const spy = vi.spyOn(window, 'addEventListener').mockImplementation((type, listener) => {
    if (type === 'elementor:init') {
      handler = listener as () => void
    }
  })
  // editor.ts has no top-level import/export, so TS treats it as a script,
  // not a module — a literal specifier fails `import()`'s module check.
  // Routing it through a variable keeps the specifier dynamic to TS.
  const specifier = '@ts/editor'
  await import(specifier)
  spy.mockRestore()
  if (!handler) {
    throw new Error('editor.ts did not register an elementor:init listener')
  }
  return handler
}

beforeEach(() => {
  Reflect.deleteProperty(window, 'elementor')
  document.body.innerHTML = ''
})

/** Same capture trick as above, for the render listener the canvas pass arms. */
async function importRenderedListener(): Promise<(event: Event) => void> {
  vi.resetModules()
  let listener: ((event: Event) => void) | undefined
  const spy = vi.spyOn(window, 'addEventListener').mockImplementation((type, handler) => {
    if (type === 'elementor/editor/element-rendered') {
      listener = handler as (event: Event) => void
    }
  })
  const specifier = '@ts/editor'
  await import(specifier)
  spy.mockRestore()
  if (!listener) {
    throw new Error('editor.ts did not register an element-rendered listener')
  }
  return listener
}

function widget(html: string, className = 'elementor-widget'): HTMLElement {
  const el = document.createElement('div')
  el.className = className
  el.innerHTML = html
  document.body.appendChild(el)
  return el
}

function rendered(el: HTMLElement, settings: Record<string, unknown>, viaModel = false): Event {
  const model = {
    get: (key: string) => (key === 'settings' ? { attributes: settings } : undefined)
  }
  const elementView = viaModel ? { el, model } : { el, getEditModel: () => model }
  return new CustomEvent('elementor/editor/element-rendered', { detail: { elementView } })
}

const LIGHTBOX = { url: 'http://localhost:3000/full.jpg', arts_lightbox: 'yes' }

describe('editor', () => {
  it('bails when window.elementor is missing entirely', async () => {
    const handler = await importEditorHandler()
    expect(() => handler()).not.toThrow()
  })

  it('bails when modules.controls.Url is missing', async () => {
    const addControlView = vi.fn()
    ;(window as unknown as { elementor: unknown }).elementor = {
      modules: { controls: {} },
      addControlView
    }
    const handler = await importEditorHandler()
    handler()
    expect(addControlView).not.toHaveBeenCalled()
  })

  it('bails when editor.addControlView is missing but Url is present', async () => {
    const { Url } = fakeUrlClass()
    ;(window as unknown as { elementor: unknown }).elementor = {
      modules: { controls: { Url } }
    }
    const handler = await importEditorHandler()
    expect(() => handler()).not.toThrow()
  })

  it('registers ArtsLightboxUrlView when both Url and addControlView are present', async () => {
    const { Url, baseOnBaseInputChange } = fakeUrlClass()
    const addControlView = vi.fn()
    ;(window as unknown as { elementor: unknown }).elementor = {
      modules: { controls: { Url } },
      addControlView
    }
    const handler = await importEditorHandler()
    handler()

    expect(addControlView).toHaveBeenCalledTimes(1)
    const [type, ViewClass] = addControlView.mock.calls[0] as [string, new () => IFakeUrlView]
    expect(type).toBe('url_arts_lightbox')

    const instance = new ViewClass()

    instance.onBaseInputChange({
      target: { dataset: { setting: 'arts_lightbox' }, checked: true }
    } as unknown as Event)
    expect(instance.setValue).toHaveBeenCalledWith('arts_lightbox', 'yes')
    expect(baseOnBaseInputChange).not.toHaveBeenCalled()

    instance.onBaseInputChange({
      target: { dataset: { setting: 'arts_lightbox' }, checked: false }
    } as unknown as Event)
    expect(instance.setValue).toHaveBeenCalledWith('arts_lightbox', '')

    instance.onBaseInputChange({
      target: { dataset: { setting: 'something_else' }, checked: true }
    } as unknown as Event)
    expect(baseOnBaseInputChange).toHaveBeenCalledTimes(1)
  })

  it('onReady reflects the saved value onto a found checkbox', async () => {
    const { Url, baseOnReady } = fakeUrlClass()
    const addControlView = vi.fn()
    ;(window as unknown as { elementor: unknown }).elementor = {
      modules: { controls: { Url } },
      addControlView
    }
    const handler = await importEditorHandler()
    handler()
    const ViewClass = addControlView.mock.calls[0]?.[1] as new () => IFakeUrlView
    const instance = new ViewClass()
    const checkboxProp = vi.fn()
    instance.$el = { find: vi.fn(() => ({ length: 1, prop: checkboxProp })) }
    instance.getControlValue = vi.fn(() => ({ arts_lightbox: 'yes' }))

    instance.onReady()

    expect(baseOnReady).toHaveBeenCalledTimes(1)
    expect(checkboxProp).toHaveBeenCalledWith('checked', true)
  })

  it('onReady does nothing to a checkbox that was not found', async () => {
    const { Url } = fakeUrlClass()
    const addControlView = vi.fn()
    ;(window as unknown as { elementor: unknown }).elementor = {
      modules: { controls: { Url } },
      addControlView
    }
    const handler = await importEditorHandler()
    handler()
    const ViewClass = addControlView.mock.calls[0]?.[1] as new () => IFakeUrlView
    const instance = new ViewClass()
    const checkboxProp = vi.fn()
    instance.$el = { find: vi.fn(() => ({ length: 0, prop: checkboxProp })) }

    expect(() => instance.onReady()).not.toThrow()
    expect(checkboxProp).not.toHaveBeenCalled()
  })

  it('keeps the badge and fallback filename synchronized with the live control value', async () => {
    const { Url } = fakeUrlClass()
    const addControlView = vi.fn()
    ;(window as unknown as { elementor: unknown }).elementor = {
      modules: { controls: { Url } },
      addControlView
    }
    const handler = await importEditorHandler()
    handler()
    const ViewClass = addControlView.mock.calls[0]?.[1] as new () => IFakeUrlView
    const instance = new ViewClass()
    const field = document.createElement('div')
    field.className = 'elementor-control-field'
    field.innerHTML = '<label class="elementor-control-title">Link</label>'
    const root = document.createElement('div')
    root.append(field)
    const input = document.createElement('input')
    const checkbox = { length: 1, prop: vi.fn() }
    const find = vi.fn((selector: string) =>
      selector.includes('arts_lightbox') ? checkbox : { length: 1, 0: input, prop: vi.fn() }
    )
    ;(instance as unknown as { $el: unknown }).$el = { 0: root, find }
    let enabled = true
    let mediaUrl = 'https://example.test/media/flower.jpg?ver=2'
    ;(instance as unknown as { getControlValue: () => Record<string, unknown> }).getControlValue =
      () => ({
        arts_lightbox: enabled ? 'yes' : '',
        url: ''
      })
    ;(instance as unknown as { model: { get(key: string): unknown } }).model = {
      get: (key) =>
        ({
          arts_lightbox_fallback: 'image',
          arts_lightbox_badge: 'Opens lightbox',
          placeholder: 'URL'
        })[key]
    }
    let fallbackListener: (() => void) | undefined
    ;(instance as unknown as { container: unknown }).container = {
      settings: { get: () => ({ url: mediaUrl }) }
    }
    ;(
      instance as unknown as {
        listenTo(_target: unknown, _event: string, callback: () => void): void
      }
    ).listenTo = (_target, event, callback) => {
      if (event === 'change:image') {
        fallbackListener = callback
      }
    }

    instance.onReady()
    expect(field.querySelector('.arts-lightbox-badge')?.textContent).toBe('Opens lightbox')
    expect(input.placeholder).toBe('…/flower.jpg')

    enabled = false
    mediaUrl = ''
    fallbackListener?.()
    instance.onBaseInputChange({ target: { dataset: { setting: 'url' } } } as unknown as Event)
    expect(field.querySelector('.arts-lightbox-badge')).toBeNull()
    expect(input.placeholder).toBe('URL')
  })

  it('tolerates a rendered control without the expected field markup', async () => {
    const { Url } = fakeUrlClass()
    const addControlView = vi.fn()
    ;(window as unknown as { elementor: unknown }).elementor = {
      modules: { controls: { Url } },
      addControlView
    }
    const handler = await importEditorHandler()
    handler()
    const ViewClass = addControlView.mock.calls[0]?.[1] as new () => IFakeUrlView
    const instance = new ViewClass()
    ;(instance as unknown as { $el: unknown }).$el = {
      0: document.createElement('div'),
      find: vi.fn(() => ({ length: 0, prop: vi.fn() }))
    }
    ;(instance as unknown as { model: { get(key: string): unknown } }).model = {
      get: () => 'image'
    }

    expect(() => instance.onReady()).not.toThrow()
  })
})

describe('editor canvas pass', () => {
  it('stamps only the anchor whose href matches the ticked setting', async () => {
    const listener = await importRenderedListener()
    const el = widget(
      '<a id="hit" href="http://localhost:3000/full.jpg"></a>' +
        '<a id="miss" href="http://localhost:3000/other.jpg"></a>'
    )

    listener(rendered(el, { link: LIGHTBOX }))

    expect(el.querySelector('#hit')?.hasAttribute('data-arts-lightbox')).toBe(true)
    expect(el.querySelector('#miss')?.hasAttribute('data-arts-lightbox')).toBe(false)
  })

  it('matches a relative href against an absolute setting', async () => {
    const listener = await importRenderedListener()
    const el = widget('<a id="hit" href="/full.jpg"></a>')

    listener(rendered(el, { link: LIGHTBOX }))

    expect(el.querySelector('#hit')?.hasAttribute('data-arts-lightbox')).toBe(true)
  })

  it('reads the model directly when the view has no getEditModel', async () => {
    const listener = await importRenderedListener()
    const el = widget('<a id="hit" href="/full.jpg"></a>')

    listener(rendered(el, { link: LIGHTBOX }, true))

    expect(el.querySelector('#hit')?.hasAttribute('data-arts-lightbox')).toBe(true)
  })

  it('leaves a matching anchor alone when the checkbox is off', async () => {
    const listener = await importRenderedListener()
    const el = widget('<a id="hit" href="/full.jpg"></a>')

    listener(rendered(el, { link: { url: 'http://localhost:3000/full.jpg' } }))

    expect(el.querySelector('#hit')?.hasAttribute('data-arts-lightbox')).toBe(false)
  })

  it('ignores an element that is not a widget', async () => {
    const listener = await importRenderedListener()
    const el = widget('<a id="hit" href="/full.jpg"></a>', 'elementor-element')

    listener(rendered(el, { link: LIGHTBOX }))

    expect(el.querySelector('#hit')?.hasAttribute('data-arts-lightbox')).toBe(false)
  })

  it('survives a view carrying no settings at all', async () => {
    const listener = await importRenderedListener()
    const el = widget('<a id="hit" href="/full.jpg"></a>')
    const event = new CustomEvent('elementor/editor/element-rendered', {
      detail: { elementView: { el } }
    })

    expect(() => listener(event)).not.toThrow()
    expect(el.querySelector('#hit')?.hasAttribute('data-arts-lightbox')).toBe(false)
  })

  it('falls back from an empty edit model to the view model and supports a jQuery-style root', async () => {
    const listener = await importRenderedListener()
    const el = widget('<a id="hit" href="/full.jpg"></a>')
    const model = {
      get: (key: string) =>
        key === 'settings' ? { attributes: { link: LIGHTBOX, invalid: null } } : undefined
    }
    const event = new CustomEvent('elementor/editor/element-rendered', {
      detail: { elementView: { $el: { 0: el }, getEditModel: () => undefined, model } }
    })

    listener(event)

    expect(el.querySelector('#hit')?.hasAttribute('data-arts-lightbox')).toBe(true)
  })

  it('is idempotent across re-renders of the same markup', async () => {
    const listener = await importRenderedListener()
    const el = widget('<a id="hit" href="/full.jpg" data-arts-lightbox></a>')

    listener(rendered(el, { link: LIGHTBOX }))

    expect(el.querySelectorAll('[data-arts-lightbox]')).toHaveLength(1)
  })
})
