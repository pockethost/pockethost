import { execSync } from 'child_process'
import fs, { writeFileSync } from 'fs'

// Define the structure of the input JSON
interface Process {
  command: string
  ppid: number | null
  pid: number
  tid: number | null
  taskcmd: string | null
  user: string
  fd: string
  type: string
  device: string
  size_off: number
  node: number
  name: string
}

// Load and parse the JSON file
const data: Process[] = JSON.parse(fs.readFileSync('lsof.json', 'utf-8'))

const cached: { [_: string]: number | null } = {}
data.forEach((proc) => {
  const { pid } = proc
  const ppid = (() => {
    if (pid in cached) {
      return cached[pid]!
    }
    console.log(`miss. ${pid} is not in cache`)
    try {
      const psOutput = execSync(`ps -o ppid= -p ${proc.pid}`)
      const ppid = parseInt(psOutput.toString().trim(), 10)
      cached[pid] = ppid
      return ppid
    } catch (e) {
      cached[pid] = null
    }
    return cached[pid]!
  })()
  proc.ppid = ppid
  console.log(`${pid}->${ppid}`)
})

writeFileSync(`./lsof.json`, JSON.stringify(data, null, 2))
