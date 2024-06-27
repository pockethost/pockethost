import { execSync } from 'child_process'
import { default as osu } from 'node-os-utils'
import { freemem } from 'os'
import {
  DAEMON_PORT,
  EDGE_NAME,
  PocketHostAction,
  PocketHostFilter,
  action,
  fetch,
  filter,
} from 'pockethost/core'
import { dbg, info } from '..'
import { getContainerChecks } from './docker'

export const notify = (lines: string[]) =>
  action(PocketHostAction.Health_OnMessage, { lines })

export type Check = {
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

export const _exec = (cmd: string) =>
  execSync(cmd, { shell: '/bin/bash', maxBuffer: 1024 * 1024 * 10 })
    .toString()
    .split(`\n`)

export const checkHealth = async () => {
  const { cpu, drive } = osu

  info(`Starting`)

  try {
    const openFiles = _exec(`lsof -n | awk '$4 ~ /^[0-9]/ {print}'`)

    function getFreeMemoryInGB(): string {
      const freeMemoryBytes: number = freemem()
      const freeMemoryGB: number = freeMemoryBytes / Math.pow(1024, 3)
      return freeMemoryGB.toFixed(2) // Rounds to 2 decimal places
    }

    const containers = getContainerChecks()
    dbg
    await notify([
      `===================`,
      `Server: ${EDGE_NAME()}`,
      `${new Date()}`,
      `CPUs: ${cpu.count()}`,
      `CPU Usage: ${await cpu.usage()}%`,
      `Free RAM: ${getFreeMemoryInGB()}GB`,
      `Free Storage: ${(await drive.info(`/`)).freeGb}GB`,
      `Open files: ${openFiles.length}`,
      `Containers: ${containers.length}`,
    ])

    const checks = await filter(PocketHostFilter.EdgeSelfCheck_Checks, [
      {
        name: `edge daemon`,
        priority: 8,
        emoji: `:imp:`,
        isHealthy: false,
        url: `http://localhost:${DAEMON_PORT()}/_api/health`,
      },
      ...containers,
    ])

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
    await notify([
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
    action(PocketHostAction.Health_OnError, `${e}`)
  }
}
