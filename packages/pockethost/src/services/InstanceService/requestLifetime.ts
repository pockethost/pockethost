type Closable = {
  once: (event: 'close', listener: () => void) => unknown
  destroyed?: boolean
}

const once = (fn: () => void) => {
  let called = false
  return () => {
    if (called) return
    called = true
    fn()
  }
}

/**
 * Ties an instance's open-request and gateway-pending counters to the lifetime of one proxied response.
 *
 * The close listener is registered before the caller awaits instance startup. If it were registered afterwards, a
 * client that disconnected during startup would have already emitted `close`, the counter would never be decremented,
 * and the instance would never hibernate.
 */
export const trackRequestLifetime = (res: Closable, releaseGatewayPending: () => void) => {
  const releaseGateway = once(releaseGatewayPending)
  let endRequest: (() => void) | undefined
  let closed = Boolean(res.destroyed)

  const release = () => {
    endRequest?.()
    releaseGateway()
  }

  res.once('close', () => {
    closed = true
    release()
  })

  return {
    /**
     * Count this request as open against the instance. Returns false (and counts nothing) if the client already
     * disconnected; the caller should stop instead of proxying.
     */
    begin: (startRequest: () => () => void) => {
      if (closed || res.destroyed) {
        release()
        return false
      }
      endRequest = once(startRequest())
      return true
    },
    /** Release everything early (e.g. on error). Safe to call more than once. */
    release,
  }
}
