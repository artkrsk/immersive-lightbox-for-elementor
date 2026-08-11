/** Video file extensions treated as self-hosted video slides. */
export const VIDEO_FILE_PATTERN = /\.(mp4|webm|mov)(\?.*)?$/i

/** YouTube URL shapes (watch, short link, embed, nocookie embed). */
export const YOUTUBE_PATTERN =
  /(?:youtube(?:-nocookie)?\.com\/(?:watch\?.*v=|embed\/)|youtu\.be\/)([\w-]{6,})/i

/** Vimeo URL shape. */
export const VIMEO_PATTERN = /vimeo\.com\/(?:video\/)?(\d+)/i
