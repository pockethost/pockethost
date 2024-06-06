import {
  DAEMON_PORT,
  DISCORD_HEALTH_CHANNEL_URL,
  MOTHERSHIP_PORT,
} from '$constants'
import { LoggerService, stringify } from '$public'
import { discordAlert } from '$util'
import Bottleneck from 'bottleneck'
import { execSync } from 'child_process'
import fetch from 'node-fetch'
import { default as osu } from 'node-os-utils'
import { freemem } from 'os'

export const checkHealth = async () => {
  const { cpu, drive } = osu

  const DISCORD_URL = DISCORD_HEALTH_CHANNEL_URL()

  const { dbg, error, info, warn } = LoggerService().create('edge-health.ts')

  info(`Starting`)

  try {
    const _exec = (cmd: string) =>
      execSync(cmd, { shell: '/bin/bash', maxBuffer: 1024 * 1024 * 10 })
        .toString()
        .split(`\n`)

    const openFiles = _exec(`lsof -n | awk '$4 ~ /^[0-9]/ {print}'`)

    type DockerPs = {
      Command: string
      CreatedAt: string
      ID: string
      Image: string
      Labels: string
      LocalVolumes: string
      Mounts: string
      Names: string
      Networks: string
      Ports: string
      RunningFor: string
      Size: string
      State: string
      Status: string
    }

    const SAMPLE: DockerPs = {
      Command: '"docker-entrypoint.s…"',
      CreatedAt: '2024-01-23 04:36:09 +0000 UTC',
      ID: '6e0921e84391',
      Image: 'pockethost-instance',
      Labels: '',
      LocalVolumes: '0',
      Mounts:
        '/home/pocketho…,/home/pocketho…,/home/pocketho…,/home/pocketho…,/home/pocketho…',
      Names: 'kekbase-1705984569777',
      Networks: 'bridge',
      Ports: '0.0.0.0:44447-\u003e8090/tcp, :::44447-\u003e8090/tcp',
      RunningFor: '7 hours ago',
      Size: '0B (virtual 146MB)',
      State: 'running',
      Status: 'Up 7 hours',
    }

    type Check = {
      name: string
      priority: number
      emoji: string
      isHealthy: boolean
      url: string

      // Instance
      port?: number
      ago?: string
      mem?: string
      created?: Date
    }

    const containers = _exec(`docker ps --format '{{json .}}'`)
      .filter((line) => line.trim())
      .map((line) => {
        dbg(line)
        return line
      })
      .map((line) => JSON.parse(line) as DockerPs)
      .map<Check>((rec) => {
        const name = rec.Names.replace(/-\d+/, '')
        const port = parseInt(rec.Ports.match(/:(\d+)/)?.[1] || '0', 10)
        const mem = rec.Size.match(/(\d+MB)/)?.[1] || '0MB'
        const created = new Date(rec.CreatedAt)
        return {
          name,
          priority: 0,
          emoji: ':octopus:',
          port,
          isHealthy: false,
          url: `http://localhost:${port}/api/health`,
          ago: rec.RunningFor,
          mem,
          created,
        }
      })

    function getFreeMemoryInGB(): string {
      const freeMemoryBytes: number = freemem()
      const freeMemoryGB: number = freeMemoryBytes / Math.pow(1024, 3)
      return freeMemoryGB.toFixed(2) // Rounds to 2 decimal places
    }

    function splitIntoChunks(
      lines: string[],
      maxChars: number = 2000,
    ): string[] {
      const chunks: string[] = []
      let currentChunk: string = ''

      lines.forEach((line) => {
        // Check if adding the next line exceeds the maxChars limit
        if (currentChunk.length + line.length + 1 > maxChars) {
          chunks.push(currentChunk)
          currentChunk = ''
        }
        currentChunk += line + '\n' // Add the line and a newline character
      })

      // Add the last chunk if it's not empty
      if (currentChunk) {
        chunks.push(currentChunk)
      }

      return chunks
    }

    const limiter = new Bottleneck({ maxConcurrent: 1 })

    const send = (lines: string[]) =>
      Promise.all(
        splitIntoChunks(lines).map((content) =>
          limiter.schedule(() =>
            fetch(DISCORD_URL, {
              method: 'POST',
              body: stringify({
                content,
              }),
              headers: { 'content-type': 'application/json' },
            }),
          ),
        ),
      )

    await send([
      `===================`,
      `Server: SFO-1`,
      `${new Date()}`,
      `CPUs: ${cpu.count()}`,
      `CPU Usage: ${await cpu.usage()}%`,
      `Free RAM: ${getFreeMemoryInGB()}GB`,
      `/: ${(await drive.info(`/`)).freeGb}GB`,
      `/mnt/pockethost-data: ${
        (await drive.info(`/mnt/pockethost-data`)).freeGb
      }GB`,
      `Open files: ${openFiles.length}`,
      `Containers: ${containers.length}`,
    ])

    const checks: Check[] = [
      {
        name: `edge proxy`,
        priority: 10,
        emoji: `:park:`,
        isHealthy: false,
        url: `https://proxy.pockethost.io/_api/health`,
      },
      {
        name: `edge daemon`,
        priority: 8,
        emoji: `:imp:`,
        isHealthy: false,
        url: `http://localhost:${DAEMON_PORT()}/_api/health`,
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
    await send([
      `---health checks---`,
      ...checks
        .sort((a, b) => {
          if (a.priority > b.priority) return -1
          if (a.priority < b.priority) return 1
          const now = new Date()
          const res = +(b.created || now) - +(a.created || now)
          if (res) return res
          return a.name.localeCompare(b.name)
        })
        .map(({ name, isHealthy, emoji, mem, ago }) => {
          const isInstance = !!mem
          if (isInstance) {
            return `${
              isHealthy ? ':white_check_mark:' : ':face_vomiting: '
            } \`${name.padStart(30)} ${(mem || '').padStart(10)} ${(
              ago || ''
            ).padStart(20)}\``
          } else {
            return `${
              isHealthy ? ':white_check_mark:' : ':face_vomiting: '
            }  ${name}`
          }
        }),
    ])
  } catch (e) {
    discordAlert(`${e}`)
  }
}
