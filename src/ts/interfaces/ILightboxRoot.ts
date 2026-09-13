/** One announced lightbox, retaining its exact original opener until destruction. */
export interface ILightboxRoot {
  readonly root: HTMLElement
  readonly sourceElement: HTMLElement
  readonly index: number
  readonly total: number
}
