import { dbg } from '..'
import { Check, _exec } from './checkHealth'

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

export const getContainerChecks = () =>
  _exec(`docker ps --format '{{json .}}'`)
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
