// Detection now lives in video/parseVideoUrl.ts; these two patterns remain
// only for buildVideoElement's id extraction until V6 rewires it.

/** YouTube URL shapes (watch, short link, embed, nocookie embed). */
export const YOUTUBE_PATTERN =
  /(?:youtube(?:-nocookie)?\.com\/(?:watch\?.*v=|embed\/)|youtu\.be\/)([\w-]{6,})/i

/** Vimeo URL shape. */
export const VIMEO_PATTERN = /vimeo\.com\/(?:video\/)?(\d+)/i
