/** What the flight carries: a fresh img clone, or a LIVE element (an adopted
 *  video keeps playing while it flies). */
export type TFlightMedia = { kind: 'img'; src: string } | { kind: 'element'; el: HTMLElement }
