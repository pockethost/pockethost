import { createProxyServer } from './ProxyServer'
createProxyServer().then((api) => {
  process.once('SIGUSR2', async () => {
    api.shutdown()
  })
})
