import { readFileSync } from 'fs'
import http from 'http'
import httpProxy from 'http-proxy'
import { createServer } from 'https'

const options = {
  key: readFileSync(process.env.SSL_KEY || ''),
  cert: readFileSync(process.env.SSL_CERT || ''),
}

const proxy = httpProxy.createProxyServer({})

const server = createServer(options, async (req, res) => {
  const headers = {
    'Access-Control-Allow-Origin': '*' /* @dev First, read about security */,
    'Access-Control-Allow-Methods': 'OPTIONS, POST, GET',
    'Access-Control-Max-Age': 2592000, // 30 days
    'Access-Control-Allow-Headers': `authorization,content-type`,
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers)
    res.end()
    return
  }

  console.log(req.headers.host)
  const { host } = req.headers
  if (host === process.env.PUBLIC_APP_DOMAIN) {
    proxy.web(req, res, { target: `http://localhost:5173` })
  } else {
    proxy.web(req, res, { target: `http://localhost:3000` })
  }
})

server.listen(443)

const httpServer = http.createServer((req, res) => {
  res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` })
  res.end()
})

httpServer.listen(80)
console.log(`Listening 80->443`)
