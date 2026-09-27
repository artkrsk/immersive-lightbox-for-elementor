// @vitest-environment happy-dom

import { acquireLightboxHost, releaseLightboxHost } from '@ts/core/lightboxHost'
import { beforeEach, describe, expect, it } from 'vitest'

// The literal, deliberately not imported: the stylesheet and the cursor
// follower's scope both key on it, so a rename has to fail here.
const HOST = 'arts-lightbox-host'

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('lightboxHost', () => {
  it('creates one box-less body child the stylesheet scopes to', () => {
    const host = acquireLightboxHost()

    expect(host.parentElement).toBe(document.body)
    expect(host.classList.contains(HOST)).toBe(true)
    // A box would become the root's containing block and stacking context.
    expect(host.style.display).toBe('contents')
  })

  it('reuses the host already in the body', () => {
    const first = acquireLightboxHost()

    expect(acquireLightboxHost()).toBe(first)
    expect(document.body.querySelectorAll(`.${HOST}`)).toHaveLength(1)
  })

  it('creates a fresh one after the body was swapped', () => {
    // An AJAX transition can replace the body contents between two opens.
    const first = acquireLightboxHost()
    document.body.innerHTML = ''

    const second = acquireLightboxHost()

    expect(second).not.toBe(first)
    expect(second.isConnected).toBe(true)
  })

  it('ignores a nested element that merely carries the class', () => {
    const nested = document.createElement('div')
    nested.className = HOST
    document.body.appendChild(document.createElement('main')).appendChild(nested)

    expect(acquireLightboxHost()).not.toBe(nested)
  })

  it('removes the host once empty', () => {
    const host = acquireLightboxHost()

    releaseLightboxHost(host)

    expect(host.isConnected).toBe(false)
  })

  it('keeps a host that still holds a root', () => {
    // An overlapping session: the previous root is still closing in it.
    const host = acquireLightboxHost()
    host.appendChild(document.createElement('div'))

    releaseLightboxHost(host)

    expect(host.isConnected).toBe(true)
  })
})
