/**
 * Resolved thumbnails, keyed by the video's oEmbed path. Module-level so the
 * same clip in two galleries — or a gallery reopened after a close, which
 * builds a fresh strip every time — costs one round trip for the page's life.
 * Failures are kept too: a 404 is not going to become a 200 while the page is
 * open, and retrying per open would make a private video cost forever.
 */
const posters = new Map<string, Promise<string | undefined>>()

/**
 * Vimeo's thumbnail is the one poster that cannot be derived from an id the
 * way `posterUrl` derives YouTube's — oEmbed is the only public route. It
 * needs no key and answers with `access-control-allow-origin: *`, so this is a
 * plain GET with no preflight and no proxy.
 *
 * The `width` parameter nominally sizes the *player*, but it has the side
 * effect of pinning `thumbnail_url` to 295x166 — without it the reply's size
 * varies per video (640px wide for some), which for a 56px tile is bytes spent
 * on nothing. 295x166 is the same size class as the `mqdefault` we ask
 * YouTube for.
 *
 * Never rejects. A thumbnail is a nicety, and the caller's fallback is the
 * play glyph it is already showing.
 */
export function vimeoPoster(id: string, hash?: string): Promise<string | undefined> {
  // A public id ignores a hash it does not need, so the path form is safe to
  // build unconditionally — no branch on whether the video is unlisted.
  const path = hash ? `${id}/${hash}` : id
  let poster = posters.get(path)
  if (!poster) {
    poster = request(path)
    posters.set(path, poster)
  }
  return poster
}

async function request(path: string): Promise<string | undefined> {
  const url = encodeURIComponent(`https://vimeo.com/${path}`)
  try {
    // A deleted or private video answers 404 with cors headers rather than
    // failing the fetch, so the status is the signal — not a thrown error.
    const response = await fetch(`https://vimeo.com/api/oembed.json?url=${url}&width=320`)
    if (!response.ok) {
      return undefined
    }
    const data = (await response.json()) as { thumbnail_url?: unknown }
    return typeof data.thumbnail_url === 'string' ? data.thumbnail_url : undefined
  } catch {
    return undefined
  }
}
