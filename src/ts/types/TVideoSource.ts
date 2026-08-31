/**
 * A parsed video reference. `file` has no id (the URL itself is the source);
 * providers carry the extracted id, Vimeo optionally its private-access
 * hash, YouTube optionally a start offset in seconds.
 */
export type TVideoSource = {
  provider: 'youtube' | 'vimeo' | 'file'
  id?: string
  hash?: string
  start?: number
}
