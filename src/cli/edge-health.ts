import {
  DAEMON_PORT,
  DEBUG,
  DefaultSettingsService,
  DISCORD_HEALTH_CHANNEL_URL,
  MOTHERSHIP_NAME,
  MOTHERSHIP_PORT,
  SETTINGS,
} from '$constants'
import { LoggerService, LogLevelName } from '$shared'
import { execSync } from 'child_process'
import fetch from 'node-fetch'
import { freemem } from 'os'

DefaultSettingsService(SETTINGS)

const DISCORD_URL = DISCORD_HEALTH_CHANNEL_URL()

const { dbg, error, info, warn } = LoggerService({
  level: DEBUG() ? LogLevelName.Debug : LogLevelName.Info,
}).create('edge-health.ts')

info(`Starting`)

const _exec = (cmd: string) =>
  execSync(cmd, { shell: '/bin/bash', maxBuffer: 1024 * 1024 * 10 })
    .toString()
    .split(`\n`)

const openFiles = _exec(`lsof -n | awk '$4 ~ /^[0-9]/ {print}'`)

const [freeSpace] = _exec(`df -h / | awk 'NR==2{print $4}'`)

const containers = _exec(
  `docker ps --format '{{.Names}} {{.Ports}}' | awk '{print $1, $2}' | sed 's/-[0-9]* / /' |  awk -F':' '{print $1, $2}' | awk '{print $1, $3}' | awk -F'->' '{print $1}'`,
)
  .map((line) => line.split(/\s+/))
  .filter((split): split is [string, string] => !!split[0])
  .filter(([name]) => name !== MOTHERSHIP_NAME())
  .map(([name, port]) => {
    return {
      name,
      priority: 0,
      emoji: ':guitar:',
      port: parseInt(port || '0', 10),
      isHealthy: false,
      url: `http://localhost:${port}/api/health`,
    }
  })

const checks: {
  name: string
  priority: number
  emoji?: string
  isHealthy: boolean
  url: string
  port?: number
}[] = [
  {
    name: `edge proxy`,
    priority: 10,
    emoji: `:park:`,
    isHealthy: false,
    url: `https://proxy.pockethost.io/api/health`,
  },
  {
    name: `edge daemon`,
    priority: 8,
    emoji: `:imp:`,
    isHealthy: false,
    url: `http://localhost:${DAEMON_PORT()}/api/health`,
  },
  {
    name: `mothership`,
    priority: 9,
    emoji: `:flying_saucer:`,
    isHealthy: false,
    url: `http://localhost:${MOTHERSHIP_PORT()}/api/health`,
  },
  ...containers,
]

await Promise.all(
  checks.map(async (check) => {
    const { url } = check
    dbg({ container: check })
    try {
      const res = await fetch(url)
      dbg({ url, status: res.status })
      check.isHealthy = res.status === 200
      return true
    } catch (e) {
      dbg(`${url}: ${e}`)
      check.isHealthy = false
    }
  }),
)
dbg({ checks })

function getFreeMemoryInGB(): string {
  const freeMemoryBytes: number = freemem()
  const freeMemoryGB: number = freeMemoryBytes / Math.pow(1024, 3)
  return freeMemoryGB.toFixed(2) // Rounds to 2 decimal places
}

await fetch(DISCORD_URL, {
  method: 'POST',
  body: JSON.stringify({
    content: [
      `===================`,
      `Server: SFO-1`,
      `${new Date()}`,
      `Free RAM: ${getFreeMemoryInGB()}`,
      `Free disk: ${freeSpace}`,
      `${checks.length} containers running and ${openFiles.length} open files.`,
      ...checks
        .sort((a, b) => {
          if (a.priority > b.priority) return -1
          if (a.priority < b.priority) return 1
          return a.name.localeCompare(b.name)
        })
        .map(
          ({ name, isHealthy, emoji }) =>
            `${
              isHealthy ? ':white_check_mark:' : ':face_vomiting: '
            } ${emoji} ${name}`,
        ),
    ].join(`\n`),
  }),
  headers: { 'content-type': 'application/json' },
})
