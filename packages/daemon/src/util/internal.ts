export const mkInternalAddress = (port: number) => `127.0.0.1:${port}`
export const mkInternalUrl = (port: number) =>
  `http://${mkInternalAddress(port)}`
