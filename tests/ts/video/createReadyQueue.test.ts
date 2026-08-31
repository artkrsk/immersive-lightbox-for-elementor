import { createReadyQueue } from '@ts/video/createReadyQueue'
import { describe, expect, it, vi } from 'vitest'

describe('createReadyQueue', () => {
  it('holds commands until readiness, then flushes in order', () => {
    const post = vi.fn()
    const q = createReadyQueue(post)
    q.send('a')
    q.send('b')
    expect(post).not.toHaveBeenCalled()
    q.markReady()
    expect(post.mock.calls).toEqual([['a'], ['b']])
  })

  it('posts straight through once ready', () => {
    const post = vi.fn()
    const q = createReadyQueue(post)
    q.markReady()
    q.send('a')
    expect(post).toHaveBeenCalledExactlyOnceWith('a')
  })

  it('a second markReady does not re-flush', () => {
    const post = vi.fn()
    const q = createReadyQueue(post)
    q.send('a')
    q.markReady()
    q.markReady()
    expect(post).toHaveBeenCalledTimes(1)
  })

  it('reset re-arms buffering for a reloaded player document', () => {
    const post = vi.fn()
    const q = createReadyQueue(post)
    q.markReady()
    q.reset()
    q.send('a')
    expect(post).not.toHaveBeenCalled()
    q.markReady()
    expect(post).toHaveBeenCalledExactlyOnceWith('a')
  })

  it('commands queued before a reload survive it', () => {
    const post = vi.fn()
    const q = createReadyQueue(post)
    q.send('a')
    q.reset()
    q.markReady()
    expect(post).toHaveBeenCalledExactlyOnceWith('a')
  })

  it('clear drops pending commands', () => {
    const post = vi.fn()
    const q = createReadyQueue(post)
    q.send('a')
    q.clear()
    q.markReady()
    expect(post).not.toHaveBeenCalled()
  })
})
