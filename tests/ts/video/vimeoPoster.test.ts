import { vimeoPoster } from '@ts/video/vimeoPoster'
import { afterEach, describe, expect, it, vi } from 'vitest'

/** The oEmbed reply, trimmed to the one field we read. */
function reply(thumbnail_url: unknown): Response {
  return { ok: true, json: async () => ({ thumbnail_url }) } as unknown as Response
}

function stubFetch(impl: (url: string) => Response | Promise<Response>) {
  const fetch = vi.fn((url: string) => Promise.resolve(impl(url)))
  vi.stubGlobal('fetch', fetch)
  return fetch
}

// The cache is module-level and deliberately has no reset hatch, so every case
// uses an id of its own rather than reaching for vi.resetModules().
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('vimeoPoster', () => {
  it('asks oEmbed for the video and returns its thumbnail', async () => {
    const fetch = stubFetch(() => reply('https://i.vimeocdn.com/video/1-d_295x166'))

    await expect(vimeoPoster('1001')).resolves.toBe('https://i.vimeocdn.com/video/1-d_295x166')
    expect(fetch).toHaveBeenCalledWith(
      'https://vimeo.com/api/oembed.json?url=https%3A%2F%2Fvimeo.com%2F1001&width=320'
    )
  })

  it('carries the private hash as a path segment, which is what unlisted videos need', async () => {
    const fetch = stubFetch(() => reply('t.jpg'))
    await vimeoPoster('1002', 'abc1234567')

    expect(fetch).toHaveBeenCalledWith(
      'https://vimeo.com/api/oembed.json?url=https%3A%2F%2Fvimeo.com%2F1002%2Fabc1234567&width=320'
    )
  })

  it('asks once per video, however many slides want it', async () => {
    const fetch = stubFetch(() => reply('t.jpg'))
    const [first, second] = await Promise.all([vimeoPoster('1003'), vimeoPoster('1003')])
    await vimeoPoster('1003')

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(first).toBe('t.jpg')
    expect(second).toBe('t.jpg')
  })

  it('tells the hash apart from the bare id — they are different videos', async () => {
    const fetch = stubFetch(() => reply('t.jpg'))
    await vimeoPoster('1004')
    await vimeoPoster('1004', 'abc1234567')

    expect(fetch).toHaveBeenCalledTimes(2)
  })

  // A deleted or private video answers 404 WITH cors headers, so fetch resolves
  // rather than throwing — the status is the only signal.
  it('resolves undefined on a refused request', async () => {
    stubFetch(() => ({ ok: false, json: async () => ({}) }) as unknown as Response)

    await expect(vimeoPoster('1005')).resolves.toBeUndefined()
  })

  it('resolves undefined when the network fails outright', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline')))
    )

    await expect(vimeoPoster('1006')).resolves.toBeUndefined()
  })

  it('resolves undefined on a reply that carries no usable thumbnail', async () => {
    stubFetch((url) => reply(url.includes('1007') ? undefined : 42))

    await expect(vimeoPoster('1007')).resolves.toBeUndefined()
    await expect(vimeoPoster('1008')).resolves.toBeUndefined()
  })

  it('remembers a failure too — a 404 will not turn into a 200 while the page lives', async () => {
    const fetch = stubFetch(() => ({ ok: false, json: async () => ({}) }) as unknown as Response)
    await vimeoPoster('1009')
    await vimeoPoster('1009')

    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
