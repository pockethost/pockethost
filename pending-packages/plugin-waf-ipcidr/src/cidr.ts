import IPCIDR from 'ip-cidr'
import { NextFunction, Request, Response } from 'pockethost/core'

// Middleware factory to create an IP blocking middleware based on CIDR ranges
export const createIpWhitelistMiddleware = (allowedCIDRs: string[]) => {
  const allowedCIDRObjects = allowedCIDRs.map((cidr) => new IPCIDR(cidr))

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip // or req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (
      allowedCIDRs.length === 0 ||
      allowedCIDRObjects.some((cidr) => cidr.contains(ip))
    ) {
      next()
    } else {
      res.status(403).send('Nope')
    }
  }
}
