import { readFileSync } from 'fs'
import http from 'http'
import httpProxy from 'http-proxy'
import { createServer } from 'https'

const options = {
  key: readFileSync(process.env.SSL_KEY || ''),
  cert: readFileSync(process.env.SSL_CERT || ''),
}

const proxy = httpProxy.createProxyServer({})
proxy.on('error', (e) => {
  console.error(e)
})

const server = createServer(options, async (req, res) => {
  const headers = {
    'Access-Control-Allow-Origin': '*' /* @dev First, read about security */,
    'Access-Control-Allow-Methods': 'OPTIONS, POST, GET, PATCH, DELETE, PUT',
    'Access-Control-Max-Age': 2592000, // 30 days
    'Access-Control-Allow-Headers': `authorization,content-type,cache-control`,
  }

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Headers', '*')
    res.writeHead(204, headers)
    res.end()
    return
  }
  res.setHeader('Access-Control-Allow-Origin', '*')

  const { host } = req.headers

  try {
    if (host === process.env.PUBLIC_APP_DOMAIN) {
      proxy.web(req, res, { target: `http://localhost:5173` })
    } else {
      proxy.web(req, res, { target: `http://localhost:3000` })
    }
  } catch (e) {
    console.error(`Got an error ${e}`)
    res.statusCode = 500
    res.end()
  }
})

//
// Listen to the `upgrade` event and proxy the
// WebSocket requests as well.
//
server.on('upgrade', function (req, socket, head) {
  console.log(req.headers.host)
  const { host } = req.headers

  try {
    if (host === process.env.PUBLIC_APP_DOMAIN) {
      proxy.ws(req, socket, head, { target: `http://localhost:5173` })
    } else {
      proxy.ws(req, socket, head, { target: `http://localhost:3000` })
    }
  } catch (e) {
    console.error(`Got an error ${e}`)
  }
})

server.listen(443)

const httpServer = http.createServer((req, res) => {
  res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` })
  res.end()
})

httpServer.listen(80)
console.log(`Listening 80->443`)
