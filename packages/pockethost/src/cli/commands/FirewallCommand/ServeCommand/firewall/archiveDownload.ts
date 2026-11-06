import { Logger, verifyArchiveLink } from '@'
import { RequestHandler } from 'express'

export type ArchiveDownloadDeps = {
  /** Only requests for this host are handled; everything else passes through. */
  host: string
  secret: () => string
  presign: (instanceId: string) => Promise<string>
  now?: () => number
  logger: Logger
}

const MESSAGES: Record<number, string> = {
  400: `This download link is malformed.`,
  403: `This download link is not valid.`,
  404: `This archive is no longer available.`,
  410: `This download link has expired, and the archive has been deleted.`,
  500: `Something went wrong preparing your download. Please try again or contact support.`,
}

/**
 * GET /_ph/archive/:instanceId?exp=&sig= on the mothership host. Verifies the signed link from the archive email, then
 * redirects to a short-lived presigned object-storage URL so the file never streams through the edge.
 */
export const createArchiveDownloadMiddleware = ({
  host,
  secret,
  presign,
  now = Date.now,
  logger,
}: ArchiveDownloadDeps): RequestHandler => {
  const { info, error } = logger.create(`archiveDownload`)
  const fail = (res: Parameters<RequestHandler>[1], status: number) => {
    res
      .status(status)
      .type(`text/plain`)
      .send(MESSAGES[status] ?? MESSAGES[500])
  }

  return (req, res, next) => {
    const match = req.method === `GET` && req.hostname === host ? /^\/_ph\/archive\/([^/]+)$/.exec(req.path) : null
    if (!match) {
      next()
      return
    }
    const instanceId = match[1]!

    const check = verifyArchiveLink(instanceId, req.query.exp, req.query.sig, secret(), now())
    if (!check.ok) {
      info(`rejected ${instanceId}: ${check.reason}`)
      fail(res, check.status)
      return
    }

    presign(instanceId)
      .then((url) => {
        info(`download ${instanceId}`)
        res.redirect(302, url)
      })
      .catch((e) => {
        const missing = /not found|doesn't exist|404/i.test(`${e}`)
        if (!missing) error(`presign failed for ${instanceId}`, e)
        fail(res, missing ? 404 : 500)
      })
  }
}
