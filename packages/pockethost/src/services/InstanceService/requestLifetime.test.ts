import { EventEmitter } from 'node:events'
import { describe, expect, it } from 'vitest'
import { trackRequestLifetime } from './requestLifetime'

const mkRes = () => Object.assign(new EventEmitter(), { destroyed: false })

const mkCounters = () => {
  const counters = { open: 0, gateway: 1 }
  return {
    counters,
    releaseGateway: () => {
      counters.gateway--
    },
    startRequest: () => {
      counters.open++
      return () => {
        counters.open--
      }
    },
  }
}

describe('trackRequestLifetime', () => {
  it('releases both counters when the response closes normally', () => {
    const res = mkRes()
    const { counters, releaseGateway, startRequest } = mkCounters()
    const lifetime = trackRequestLifetime(res, releaseGateway)

    expect(lifetime.begin(startRequest)).toBe(true)
    expect(counters).toEqual({ open: 1, gateway: 1 })

    res.emit('close')
    expect(counters).toEqual({ open: 0, gateway: 0 })
  })

  it('does not leak when the client disconnects while the instance is starting', () => {
    const res = mkRes()
    const { counters, releaseGateway, startRequest } = mkCounters()
    const lifetime = trackRequestLifetime(res, releaseGateway)

    // Client gives up during a slow container start: close fires before begin().
    res.emit('close')
    res.destroyed = true

    expect(lifetime.begin(startRequest)).toBe(false)
    expect(counters).toEqual({ open: 0, gateway: 0 })
  })

  it('does not count a request whose response was already destroyed', () => {
    const res = mkRes()
    res.destroyed = true
    const { counters, releaseGateway, startRequest } = mkCounters()
    const lifetime = trackRequestLifetime(res, releaseGateway)

    expect(lifetime.begin(startRequest)).toBe(false)
    expect(counters).toEqual({ open: 0, gateway: 0 })
  })

  it('releases at most once when an error and close both happen', () => {
    const res = mkRes()
    const { counters, releaseGateway, startRequest } = mkCounters()
    const lifetime = trackRequestLifetime(res, releaseGateway)

    lifetime.begin(startRequest)
    lifetime.release()
    res.emit('close')
    lifetime.release()

    expect(counters).toEqual({ open: 0, gateway: 0 })
  })

  it('releases the gateway slot on error before the instance was ready', () => {
    const res = mkRes()
    const { counters, releaseGateway } = mkCounters()
    const lifetime = trackRequestLifetime(res, releaseGateway)

    lifetime.release()
    res.emit('close')

    expect(counters).toEqual({ open: 0, gateway: 0 })
  })
})
