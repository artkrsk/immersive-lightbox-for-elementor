/** The slice of Arts Cursor Follower's global we depend on — nothing more. */
interface ICursorFollowerGlobal {
  get(): { refresh?(): void } | null
}

/**
 * Tell a cursor follower that what its rules match has changed.
 *
 * It resolves a rule when the pointer crosses into an element and holds it
 * while the pointer sits still, which is right for hover and wrong for us:
 * our slides change under a parked pointer, and a slide's zoomability is
 * only known once its real dimensions arrive. Without this the cursor keeps
 * the previous slide's promise until the pointer leaves and comes back.
 *
 * Duck-typed all the way down: the plugin may be absent, not yet booted, or
 * older than the method. Its own call is silent when nothing resolves
 * differently, so this is safe to fire on any state change.
 */
export function nudgeCursorFollower(): void {
  const follower = (window as { artsCursor?: ICursorFollowerGlobal }).artsCursor
  follower?.get()?.refresh?.()
}
