import { createProxyServer } from './ProxyServer'
// npm install eventsource --save
global.EventSource = require('eventsource')

createProxyServer().then((api) => {
  process.once('SIGUSR2', async () => {
    console.log(`SIGUSR2 detected`)
    api.shutdown()
  })
})
