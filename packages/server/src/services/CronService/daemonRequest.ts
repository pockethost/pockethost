import http from 'node:http'

export type DaemonResponse = { status: number; body: string }

export type DaemonRequestOptions = {
  port: number
  /** Instance hostname, e.g. `foo.pockethost.io`. The daemon routes on it. */
  host: string
  /** Path and query, starting with `/`. */
  path: string
  /** Total time allowed for the whole response. */
  timeoutMs: number
  /** Extra request headers. */
  headers?: Record<string, string>
}

/**
 * GETs a path on an instance through the local daemon, skipping Cloudflare (which cuts proxied requests off at ~100s)
 * and the firewall. Uses node:http because fetch drops the Host header.
 */
export const daemonRequest = ({ port, host, path, timeoutMs, headers = {} }: DaemonRequestOptions) =>
  new Promise<DaemonResponse>((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path, method: 'GET', headers: { ...headers, host } }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => {
        clearTimeout(timer)
        resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') })
      })
      res.on('error', (e) => {
        clearTimeout(timer)
        reject(e)
      })
    })
    const timer = setTimeout(
      () => req.destroy(new Error(`timed out after ${Math.round(timeoutMs / 1000)}s`)),
      timeoutMs
    )
    req.on('error', (e) => {
      clearTimeout(timer)
      reject(e)
    })
    req.end()
  })
