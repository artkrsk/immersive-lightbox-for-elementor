import type { TVideoSource } from '../types'

// Grounded in ArtsUtilities' production patterns, extended with the gaps its
// research surfaced: YouTube Shorts/live already covered there, /v/ legacy,
// timestamp carry; Vimeo PRIVATE HASH capture (vimeo.com/{id}/{hash} and
// ?h= forms) — dropping the hash silently breaks unlisted videos.
const YOUTUBE =
  /(?:youtube(?:-nocookie)?\.com\/(?:watch\?[^#]*?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([\w-]{11})/i
const VIMEO =
  /vimeo\.com\/(?:(?:channels\/[\w-]+\/)|(?:groups\/[\w-]+\/videos\/)|(?:video\/))?(\d+)(?:\/([a-zA-Z0-9]+))?/i
const VIDEO_FILE = /\.(mp4|webm|ogv|mov|m4v)$/i

/** "90", "1m30s", "1h2m3s" → seconds. */
function parseTimestamp(value: string | null): number | undefined {
  if (!value) {
    return undefined
  }
  if (/^\d+$/.test(value)) {
    return Number.parseInt(value, 10)
  }
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value)
  if (!match || (!match[1] && !match[2] && !match[3])) {
    return undefined
  }
  return (
    Number.parseInt(match[1] ?? '0', 10) * 3600 +
    Number.parseInt(match[2] ?? '0', 10) * 60 +
    Number.parseInt(match[3] ?? '0', 10)
  )
}

function searchParams(url: string): URLSearchParams {
  try {
    return new URL(url, 'https://localhost/').searchParams
  } catch {
    return new URLSearchParams()
  }
}

function pathname(url: string): string {
  try {
    return new URL(url, 'https://localhost/').pathname
  } catch {
    return url.split('?')[0]?.split('#')[0] ?? url
  }
}

/**
 * Classifies a URL as a video reference — provider platforms first (a
 * youtube.com URL is YouTube no matter what its path looks like), file
 * extensions as the fallback. Null = not a video URL.
 */
export function parseVideoUrl(url: string): TVideoSource | null {
  if (!url || typeof url !== 'string') {
    return null
  }

  const yt = YOUTUBE.exec(url)
  if (yt?.[1]) {
    const params = searchParams(url)
    const start = parseTimestamp(params.get('t')) ?? parseTimestamp(params.get('start'))
    const source: TVideoSource = { provider: 'youtube', id: yt[1] }
    if (start !== undefined) {
      source.start = start
    }
    return source
  }

  const vimeo = VIMEO.exec(url)
  if (vimeo?.[1]) {
    const source: TVideoSource = { provider: 'vimeo', id: vimeo[1] }
    const hash = vimeo[2] ?? searchParams(url).get('h')
    if (hash) {
      source.hash = hash
    }
    return source
  }

  if (VIDEO_FILE.test(pathname(url))) {
    return { provider: 'file' }
  }

  return null
}
