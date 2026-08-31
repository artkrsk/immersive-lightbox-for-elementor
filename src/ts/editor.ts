/**
 * Elementor editor entry (parent window, not the preview iframe): registers
 * the control view for our lightbox-aware URL control so the checkbox
 * renders and persists, and stamps the checkbox's attribute onto anchors the
 * canvas draws client-side. Everything is duck-typed off `window.elementor` —
 * this bundle loads only inside the editor, where Elementor is a given, but
 * nothing here may throw if an internal shape moves.
 */

import { ATTR_LIGHTBOX } from './constants/attributes'
import { normalizeUrlKey } from './utils'
import '../styles/editor.css'

const BADGE_CLASS = 'arts-lightbox-badge'

interface IJQueryLike {
  length: number
  0?: HTMLElement
  prop(name: string, value: boolean): void
}

interface ISettingsModel {
  get(key: string): unknown
}

interface IUrlControlView {
  setValue(setting: string, value: string): void
  getControlValue(): Record<string, unknown> | undefined
  model: ISettingsModel
  container?: { settings?: ISettingsModel }
  listenTo(obj: unknown, event: string, callback: () => void): void
  $el: IJQueryLike & { find(selector: string): IJQueryLike }
  onBaseInputChange(event: Event): void
  onReady(): void
}

interface IEditorGlobal {
  modules?: { controls?: { Url?: new (...args: never[]) => IUrlControlView } }
  addControlView?(type: string, view: unknown): void
}

/** Structural minimum of an element view, as handed over on the render event. */
interface IElementModel {
  get?(key: string): { attributes?: Record<string, unknown> } | undefined
}

interface IElementView {
  el?: HTMLElement
  $el?: { 0?: HTMLElement }
  model?: IElementModel
  getEditModel?(): IElementModel | undefined
}

window.addEventListener('elementor:init', () => {
  const editor = (window as { elementor?: IEditorGlobal }).elementor
  const UrlView = editor?.modules?.controls?.Url
  if (!UrlView || !editor?.addControlView) {
    return
  }

  class ArtsLightboxUrlView extends UrlView {
    override onBaseInputChange(event: Event): void {
      const input = event.target as HTMLInputElement
      if (input.dataset.setting === 'arts_lightbox') {
        this.setValue('arts_lightbox', input.checked ? 'yes' : '')
        this.syncLightboxHints()
        return
      }
      super.onBaseInputChange(event)
      if (input.dataset.setting === 'url') {
        this.syncLightboxHints()
      }
    }

    override onReady(): void {
      super.onReady()
      // The template renders the checkbox unchecked; reflect the saved value.
      const checkbox = this.$el.find('input[data-setting="arts_lightbox"]')
      if (checkbox.length) {
        checkbox.prop('checked', this.getControlValue()?.arts_lightbox === 'yes')
      }

      const fallback = this.fallbackSettingName()
      if (fallback) {
        // Re-resolve when the widget's media changes under us.
        this.listenTo(this.container?.settings, `change:${fallback}`, () =>
          this.syncLightboxHints()
        )
      }
      this.syncLightboxHints()
    }

    /** Name of the sibling media setting that stands in for an empty URL, if the widget declared one. */
    private fallbackSettingName(): string {
      const name = this.model?.get?.('arts_lightbox_fallback')
      return typeof name === 'string' ? name : ''
    }

    private isLightboxOn(): boolean {
      return this.getControlValue()?.arts_lightbox === 'yes'
    }

    /**
     * The badge says what will happen, the placeholder says what will open.
     * Two hints rather than one crowded field — and the badge covers the case
     * a placeholder cannot reach at all: a typed URL, where no placeholder is
     * left to carry the hint.
     */
    private syncLightboxHints(): void {
      this.syncBadge()
      this.syncFallbackPlaceholder()
    }

    /** A marker beside the label, because the options popover is usually shut. */
    private syncBadge(): void {
      const field = this.$el[0]?.querySelector('.elementor-control-field')
      const label = field?.querySelector('.elementor-control-title')
      if (!field || !label) {
        return
      }

      let badge = field.querySelector<HTMLElement>(`.${BADGE_CLASS}`)

      if (!this.isLightboxOn()) {
        badge?.remove()
        return
      }

      if (!badge) {
        badge = document.createElement('span')
        badge.className = BADGE_CLASS
        // Straight after the label, so it rides the label's own wrapped row.
        label.insertAdjacentElement('afterend', badge)
      }

      const text = this.model?.get?.('arts_lightbox_badge')
      badge.textContent = typeof text === 'string' && text ? text : 'Lightbox'
    }

    /**
     * Names the file an empty URL will open. Only while the box is ticked —
     * with it off an empty URL means no link at all, and the hint would lie.
     * Long names are left to the field to clip: the badge already says what
     * happens, so this only has to be recognisable, not complete.
     */
    private syncFallbackPlaceholder(): void {
      const fallback = this.fallbackSettingName()
      if (!fallback) {
        return
      }

      const input = this.$el.find('input[data-setting="url"]')[0] as HTMLInputElement | undefined
      if (!input) {
        return
      }

      const value = this.getControlValue()
      const typed = typeof value?.url === 'string' && value.url !== ''

      let hint = ''
      if (!typed && this.isLightboxOn()) {
        const media = this.container?.settings?.get(fallback) as { url?: unknown } | undefined
        const url = typeof media?.url === 'string' ? media.url : ''
        const file = url.split('?')[0]?.split('/').pop() ?? ''
        hint = file ? `…/${file}` : ''
      }

      const stock = this.model?.get?.('placeholder')
      input.placeholder = hint || (typeof stock === 'string' ? stock : '')
    }
  }

  editor.addControlView('url_arts_lightbox', ArtsLightboxUrlView)
})

/**
 * A saved URL-control value with the checkbox on — the same shape
 * `UrlControlManager::inject_attribute` looks for in `get_settings_for_display()`.
 * The two predicates are each other's mirror; move one and move the other.
 */
function wantsLightbox(value: unknown): value is { url: string } {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const setting = value as { url?: unknown; arts_lightbox?: unknown }
  return typeof setting.url === 'string' && setting.url !== '' && setting.arts_lightbox === 'yes'
}

/**
 * The canvas half of the checkbox. Elementor draws 25 core widgets (Image,
 * Image Box, Icon Box, Heading, Icon List…) from a Backbone `content_template()`
 * rather than from PHP, so their anchors never pass through the render filter
 * that stamps the attribute — no server-side fix can reach them. This reads the
 * same saved settings off the element's own model and stamps what PHP would
 * have.
 *
 * Add-only, and that is deliberate: every render replaces the widget's DOM
 * wholesale, so an unticked checkbox arrives as fresh markup with nothing to
 * clear. Removing instead would strip the stamp widgets print themselves in PHP.
 *
 * No re-mark call from here. Elementor dispatches this event from a plain
 * `setTimeout`, while the per-element ready hook the gate re-marks on rides
 * `_.defer` — so the attribute is in place before that hook fires for this
 * element. If that order ever inverted the hint would simply appear one render
 * late, and the next element to render re-marks the document anyway.
 */
function stampRenderedElement(view: IElementView | undefined): void {
  const el = view?.el ?? view?.$el?.[0]
  if (!el?.classList?.contains('elementor-widget')) {
    return
  }
  const settings = (view?.getEditModel?.() ?? view?.model)?.get?.('settings')?.attributes
  if (!settings) {
    return
  }
  const base = el.ownerDocument.baseURI
  const wanted = new Set<string>()
  for (const value of Object.values(settings)) {
    if (wantsLightbox(value)) {
      wanted.add(normalizeUrlKey(value.url, base))
    }
  }
  if (!wanted.size) {
    return
  }
  // Compared as normalized keys, never as a selector: the template renders the
  // href through Elementor's own sanitizer while the setting holds what was
  // typed, so an exact string match silently finds nothing — and interpolating
  // a URL into `querySelector` throws on the first one carrying a quote.
  for (const anchor of el.querySelectorAll('a[href]')) {
    if (wanted.has(normalizeUrlKey(anchor.getAttribute('href') ?? '', base))) {
      anchor.setAttribute(ATTR_LIGHTBOX, '')
    }
  }
}

// Elementor announces every element render on the top window as well as on the
// preview's, and hands the view along — so the model is reachable without
// asking the editor to resolve one from a node.
window.top?.addEventListener('elementor/editor/element-rendered', (event) => {
  stampRenderedElement((event as CustomEvent<{ elementView?: IElementView }>).detail?.elementView)
})
