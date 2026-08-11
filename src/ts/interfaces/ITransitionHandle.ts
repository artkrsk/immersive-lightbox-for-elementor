/** Per-open transition controller returned by attachOpenTransition. */
export interface ITransitionHandle {
  /** Runs the close choreography, destroys the pswp core, cleans up. */
  close(): Promise<void>
  /** True while an open/close choreography is running. */
  isTransitioning(): boolean
}
