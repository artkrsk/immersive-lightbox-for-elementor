/**
 * The video's current frame painted onto a canvas at its rendered box,
 * replicating object-fit: cover (scale the intrinsic frame to fill the
 * box, crop the overflow around the center). Null when the video has no
 * decoded frame or the canvas is unavailable — callers degrade to the
 * bare reparent.
 */
export function snapshotVideoFrame(video: HTMLVideoElement): HTMLCanvasElement | null {
  if (video.readyState < 2) {
    return null
  }
  const box = video.getBoundingClientRect()
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(box.width * devicePixelRatio)
  canvas.height = Math.round(box.height * devicePixelRatio)
  const ctx = canvas.getContext('2d')
  if (!ctx || !canvas.width || !canvas.height) {
    return null
  }
  const vw = video.videoWidth
  const vh = video.videoHeight
  const scale = Math.max(canvas.width / vw, canvas.height / vh)
  const sw = canvas.width / scale
  const sh = canvas.height / scale
  try {
    ctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, canvas.width, canvas.height)
  } catch {
    return null
  }
  return canvas
}
