import express from 'express'
import IPCIDR from 'ip-cidr'

// Middleware factory to create an IP blocking middleware based on CIDR ranges
export const createIpWhitelistMiddleware = (blockedCIDRs: string[]) => {
  const blockedCIDRObjects = blockedCIDRs.map((cidr) => new IPCIDR(cidr))

  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    const ip = req.ip // or req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (
      blockedCIDRs.length === 0 ||
      blockedCIDRObjects.some((cidr) => cidr.contains(ip))
    ) {
      next()
    } else {
      res.status(403).send('Nope')
    }
  }
}
