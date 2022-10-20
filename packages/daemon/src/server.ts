import { createProxyServer } from './ProxyServer'
createProxyServer().then((api) => {
  process.once('SIGUSR2', async () => {
    console.log(`SIGUSR2 detected`)
    api.shutdown()
  })
})
