/**
 * The blink hover primitive: a normal layer and a duplicate parked off-view,
 * chasing in on hover. The pattern is usually built two ways — duplicated
 * markup for icons, pseudo-element fills for a burger's bars — and we collapse
 * them, because real layers can be asserted on and pseudo-elements cannot.
 *
 * `content` is empty for the close button's bars, which paint themselves with
 * a currentColor fill; `extraClass` carries their position and rotation.
 */
export function blinkMarkup(content: string, extraClass = ''): string {
  const wrapper = extraClass ? `arts-lightbox-blink ${extraClass}` : 'arts-lightbox-blink'
  return (
    `<span class="${wrapper}">` +
    `<span class="arts-lightbox-blink__layer arts-lightbox-blink__layer_normal">${content}</span>` +
    `<span class="arts-lightbox-blink__layer arts-lightbox-blink__layer_hover">${content}</span>` +
    '</span>'
  )
}
