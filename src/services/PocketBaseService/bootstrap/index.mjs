#! /usr/local/bin/node

import { spawn } from 'child_process'
import express from 'express'
import { existsSync } from 'fs'
import { default as httpProxy } from 'http-proxy'
import { chdir } from 'process'

chdir(`/home/pockethost`)

const isDev = process.env.DEV === `true`

const hasCustomNodeServer = existsSync(`./ph_app/index.js`)
const hasCustomPocketbase = existsSync(`./ph_app/pocketbase`)

console.log({ hasCustomNodeServer, hasCustomPocketbase })

/**
 * Run PocketBase, including a custom one if it exists
 */
{
  const pbBin = hasCustomPocketbase ? `./ph_app/pocketbase` : `./pocketbase`

  const args = [`serve`, `--http`, `0.0.0.0:8091`]
  if (isDev) {
    args.push(`--dev`)
  }

  const child = spawn(pbBin, args)
  child.stdout.on('data', (data) => {
    process.stdout.write(data)
  })

  child.stderr.on('data', (data) => {
    process.stderr.write(data)
  })

  child.on('exit', (code) => {
    process.exit(code || 0)
  })
}

/**
 * If index.js exists, we are running as a node proxy
 *
 */
if (hasCustomNodeServer) {
  {
    const child = spawn(`node`, [`./ph_app/index.js`])
    child.stdout.on('data', (data) => {
      process.stdout.write(data)
    })

    child.stderr.on('data', (data) => {
      process.stderr.write(data)
    })

    child.on('exit', (code) => {
      process.exit(code || 0)
    })
  }
}

const proxy = httpProxy.createProxyServer({})
proxy.on('error', (err, req, res, target) => {
  console.warn(`Proxy error ${err} on ${req.url} (${req.headers.host})`)
})

const app = express()

app.use((req, res, next) => {
  console.log(req.path)
  if (req.path.startsWith(`/_`) || req.path.startsWith(`/api/`)) {
    proxy.web(req, res, { target: `http://localhost:8091` })
  } else {
    if (hasCustomNodeServer) {
      proxy.web(req, res, { target: `http://localhost:3000` })
    } else {
      proxy.web(req, res, { target: `http://localhost:8091` })
    }
  }
})
app.listen(8090, () => {
  console.log(`Boostrap is listening`)
})
