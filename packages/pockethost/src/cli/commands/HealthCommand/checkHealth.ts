import Bottleneck from 'bottleneck'
import { execSync } from 'child_process'
import { X509Certificate } from 'crypto'
import { existsSync, readFileSync } from 'fs'
import { statfs } from 'fs/promises'
import net from 'net'
import { OSUtils } from 'node-os-utils'
import { cpus, freemem } from 'os'
import {
  DAEMON_PORT,
  DISCORD_HEALTH_CHANNEL_URL,
  LoggerService,
  MOTHERSHIP_ADMIN_PASSWORD,
  MOTHERSHIP_ADMIN_USERNAME,
  MOTHERSHIP_PORT,
  PH_FTP_PORT,
  PH_SFTP_PORT,
  SSL_CERT,
  stringify,
} from '../../..'

const MIN_FREE_RAM_GB = 5
const MIN_FREE_DISK_ROOT_GB = 10
const MIN_FREE_DISK_DATA_GB = 50
const MIN_OPEN_FILES_HEADROOM_RATIO = 0.15
const TLS_EXPIRY_WARN_DAYS = 14
const FETCH_TIMEOUT_MS = 5000
const TCP_TIMEOUT_MS = 3000

const PM2_APPS = [`firewall`, `edge-daemon`, `edge-ftp`, `edge-sftp`, `mothership`] as const

type Finding = {
  name: string
  ok: boolean
  detail?: string
  priority: number
}

const _exec = (cmd: string) =>
  execSync(cmd, { shell: '/bin/bash', maxBuffer: 1024 * 1024 * 10 })
    .toString()
    .split(`\n`)

const fetchOk = async (url: string): Promise<{ ok: boolean; detail?: string }> => {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    if (res.status === 200) return { ok: true }
    return { ok: false, detail: `HTTP ${res.status}` }
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) }
  }
}

const tcpOk = (port: number, host = `127.0.0.1`) =>
  new Promise<{ ok: boolean; detail?: string }>((resolve) => {
    const socket = net.connect({ host, port, timeout: TCP_TIMEOUT_MS })
    const finish = (ok: boolean, detail?: string) => {
      socket.destroy()
      resolve({ ok, detail })
    }
    socket.on(`connect`, () => finish(true))
    socket.on(`error`, (e) => finish(false, e.message))
    socket.on(`timeout`, () => finish(false, `timeout`))
  })

const splitIntoChunks = (lines: string[], maxChars = 2000): string[] => {
  const chunks: string[] = []
  let currentChunk = ``

  lines.forEach((line) => {
    if (currentChunk.length + line.length + 1 > maxChars) {
      chunks.push(currentChunk)
      currentChunk = ``
    }
    currentChunk += line + `\n`
  })

  if (currentChunk) chunks.push(currentChunk)
  return chunks
}

const freeDiskGb = async (mount: string) => {
  const stats = await statfs(mount)
  return (Number(stats.bfree) * Number(stats.bsize)) / 1024 ** 3
}

export const checkHealth = async () => {
  const osutils = new OSUtils()
  const { dbg, info } = LoggerService().create(`edge-health.ts`)

  info(`Starting`)

  const findings: Finding[] = []
  const push = (finding: Finding) => {
    findings.push(finding)
    dbg(finding)
  }

  const containerCount = _exec(`docker ps -q`).filter((line) => line.trim()).length

  const freeRamGb = freemem() / Math.pow(1024, 3)
  push({
    name: `free RAM`,
    ok: freeRamGb >= MIN_FREE_RAM_GB,
    detail: `${freeRamGb.toFixed(2)}GB (min ${MIN_FREE_RAM_GB}GB)`,
    priority: 7,
  })

  const rootFreeGb = await freeDiskGb(`/`)
  push({
    name: `free storage /`,
    ok: rootFreeGb >= MIN_FREE_DISK_ROOT_GB,
    detail: `${rootFreeGb.toFixed(2)}GB (min ${MIN_FREE_DISK_ROOT_GB}GB)`,
    priority: 6,
  })

  let dataDiskFreeGb: number | undefined
  try {
    dataDiskFreeGb = await freeDiskGb(`/mnt/sfo_data`)
    push({
      name: `free storage /mnt/sfo_data`,
      ok: dataDiskFreeGb >= MIN_FREE_DISK_DATA_GB,
      detail: `${dataDiskFreeGb}GB (min ${MIN_FREE_DISK_DATA_GB}GB)`,
      priority: 6,
    })
  } catch (e) {
    push({
      name: `free storage /mnt/sfo_data`,
      ok: false,
      detail: e instanceof Error ? e.message : String(e),
      priority: 6,
    })
  }

  const openFilesRaw = _exec(`cat /proc/sys/fs/file-nr`)[0]?.trim() || ``
  const [allocatedStr, , maxStr] = openFilesRaw.split(/\s+/)
  const allocated = parseInt(allocatedStr || `0`, 10)
  const maxOpen = parseInt(maxStr || `0`, 10)
  const openFilesHeadroom = maxOpen > 0 ? 1 - allocated / maxOpen : 1
  push({
    name: `open files headroom`,
    ok: openFilesHeadroom >= MIN_OPEN_FILES_HEADROOM_RATIO,
    detail: `${openFilesRaw.trim()} (${(openFilesHeadroom * 100).toFixed(1)}% headroom)`,
    priority: 5,
  })

  try {
    _exec(`docker info >/dev/null 2>&1`)
    push({ name: `docker`, ok: true, priority: 8 })
  } catch {
    push({ name: `docker`, ok: false, detail: `docker info failed`, priority: 8 })
  }

  try {
    const pm2List = JSON.parse(_exec(`pm2 jlist`).join(`\n`)) as Array<{
      name?: string
      pm2_env?: { status?: string }
    }>
    for (const app of PM2_APPS) {
      const proc = pm2List.find((entry) => entry.name === app)
      const status = proc?.pm2_env?.status
      push({
        name: `pm2 ${app}`,
        ok: status === `online`,
        detail: status || `not found`,
        priority: 9,
      })
    }
  } catch (e) {
    push({
      name: `pm2`,
      ok: false,
      detail: e instanceof Error ? e.message : String(e),
      priority: 9,
    })
  }

  const httpChecks: Array<{ name: string; url: string; priority: number }> = [
    {
      name: `edge proxy (firewall)`,
      url: `https://proxy.pockethost.io/api/firewall/health`,
      priority: 10,
    },
    {
      name: `edge proxy (daemon path)`,
      url: `https://proxy.pockethost.io/_api/daemon/health`,
      priority: 10,
    },
    {
      name: `edge daemon`,
      url: `http://localhost:${DAEMON_PORT()}/_api/daemon/health`,
      priority: 8,
    },
    {
      name: `mothership`,
      url: `http://localhost:${MOTHERSHIP_PORT()}/api/health`,
      priority: 9,
    },
  ]

  await Promise.all(
    httpChecks.map(async ({ name, url, priority }) => {
      const result = await fetchOk(url)
      push({ name, ok: result.ok, detail: result.detail, priority })
    })
  )

  const [ftpResult, sftpResult] = await Promise.all([tcpOk(PH_FTP_PORT()), tcpOk(PH_SFTP_PORT())])
  push({
    name: `edge ftp`,
    ok: ftpResult.ok,
    detail: ftpResult.detail || `port ${PH_FTP_PORT()}`,
    priority: 7,
  })
  push({
    name: `edge sftp`,
    ok: sftpResult.ok,
    detail: sftpResult.detail || `port ${PH_SFTP_PORT()}`,
    priority: 7,
  })

  if (MOTHERSHIP_ADMIN_USERNAME() && MOTHERSHIP_ADMIN_PASSWORD()) {
    try {
      const res = await fetch(`http://localhost:${MOTHERSHIP_PORT()}/api/admins/auth-with-password`, {
        method: `POST`,
        headers: { 'content-type': `application/json` },
        body: stringify({
          identity: MOTHERSHIP_ADMIN_USERNAME(),
          password: MOTHERSHIP_ADMIN_PASSWORD(),
        }),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      })
      push({
        name: `mothership admin auth`,
        ok: res.status === 200,
        detail: res.status === 200 ? undefined : `HTTP ${res.status}`,
        priority: 9,
      })
    } catch (e) {
      push({
        name: `mothership admin auth`,
        ok: false,
        detail: e instanceof Error ? e.message : String(e),
        priority: 9,
      })
    }
  }

  if (existsSync(SSL_CERT())) {
    try {
      const cert = new X509Certificate(readFileSync(SSL_CERT()))
      const daysLeft = (new Date(cert.validTo).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      push({
        name: `tls cert expiry`,
        ok: daysLeft >= TLS_EXPIRY_WARN_DAYS,
        detail: `${Math.floor(daysLeft)}d remaining (warn < ${TLS_EXPIRY_WARN_DAYS}d)`,
        priority: 6,
      })
    } catch (e) {
      push({
        name: `tls cert expiry`,
        ok: false,
        detail: e instanceof Error ? e.message : String(e),
        priority: 6,
      })
    }
  }

  const failures = findings.filter((f) => !f.ok)
  const cpuUsageResult = await osutils.cpu.usage()
  const cpuUsage = cpuUsageResult.success ? cpuUsageResult.data : NaN
  const meta = [
    `===================`,
    `${new Date()}`,
    `CPUs: ${cpus().length}`,
    `CPU Usage: ${cpuUsage}%`,
    `Free RAM: ${freeRamGb.toFixed(2)}GB`,
    `Free Storage /: ${rootFreeGb.toFixed(2)}GB`,
    ...(dataDiskFreeGb !== undefined ? [`Free Storage /mnt/sfo_data: ${dataDiskFreeGb}GB`] : []),
    `Open files: ${openFilesRaw.trim()}`,
    `Containers: ${containerCount}`,
  ]

  console.log([...meta, failures.length ? `${failures.length} failure(s)` : `ok`].join(`\n`))

  const discordUrl = DISCORD_HEALTH_CHANNEL_URL()
  if (!discordUrl) {
    throw new Error('DISCORD_HEALTH_CHANNEL_URL not set')
  }

  const limiter = new Bottleneck({ maxConcurrent: 1 })

  const send = (lines: string[]) =>
    Promise.all(
      splitIntoChunks(lines).map((content) =>
        limiter.schedule(() =>
          fetch(discordUrl, {
            method: `POST`,
            body: stringify({ content }),
            headers: { 'content-type': `application/json` },
          }).then((res) => {
            if (res.status !== 204) {
              throw new Error(`${res.status} ${res.statusText}`)
            }
          })
        )
      )
    )

  await send(meta)
  await send([
    `---health checks---`,
    ...findings
      .sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name))
      .map(({ name, ok, detail }) => {
        const emoji = ok ? ':white_check_mark:' : ':face_vomiting:'
        const suffix = detail ? `: ${detail}` : ``
        return `${emoji}  ${name}${suffix}`
      }),
  ])

  info(failures.length ? `Posted health report (${failures.length} failure(s))` : `Posted health report (all ok)`)
}
