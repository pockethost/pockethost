import { execSync } from 'child_process'

interface PsRow {
  id: string
  names: string
  runtime: string
  ports: string
}

// Tracks last printed snapshot to avoid duplicate outputs
let lastSnapshotKey: string | null = null

function getDockerPs(): PsRow[] {
  try {
    // Run docker ps with format to get id, names, runtime, and ports
    const output = execSync('docker ps --format "{{.ID}}\t{{.Names}}\t{{.RunningFor}}\t{{.Ports}}"', {
      encoding: 'utf-8',
    })
    // Split output into lines and parse into structured rows
    const lines = output
      .trim()
      .split('\n')
      .filter((line) => line)
    return lines.map((line) => {
      const [id, names, runtime, ports] = line.split('\t')
      return { id: id || '', names: names || '', runtime: runtime || '', ports: ports || '' }
    })
  } catch (error) {
    console.error('Error running docker ps. Is Docker running?', error)
    return []
  }
}

function getBaseName(name: string): string {
  // Remove timestamp suffix like -20231201-143022
  return name.replace(/-\d+$/, '')
}

function displaySortedPs(): void {
  const psData = getDockerPs()
  if (psData.length === 0) {
    // Compute a stable key for the empty state
    const snapshotKey = 'empty'
    if (snapshotKey === lastSnapshotKey) return
    lastSnapshotKey = snapshotKey
    console.log('\n' + '─'.repeat(80))
    console.log(`Monitoring duplicate containers - ${new Date().toLocaleTimeString()}`)
    console.log('No containers found or error occurred.')
    return
  }

  // Group containers by base name (ignoring timestamp)
  const groupedContainers = new Map<string, PsRow[]>()

  psData.forEach((row) => {
    const baseName = getBaseName(row.names)
    // console.log(baseName)
    if (!groupedContainers.has(baseName)) {
      groupedContainers.set(baseName, [])
    }
    groupedContainers.get(baseName)!.push(row)
  })

  // Filter to only show groups with duplicates
  const duplicateGroups = Array.from(groupedContainers.entries())
    .filter(([baseName, containers]) => containers.length > 1)
    .sort(([a], [b]) => a.localeCompare(b))

  // Build a stable snapshot key that ignores runtime (which changes over time)
  const snapshotKey = JSON.stringify(
    duplicateGroups.map(([baseName, containers]) => ({
      baseName,
      items: containers
        .slice()
        .sort((a, b) => a.names.localeCompare(b.names) || a.id.localeCompare(b.id))
        .map((c) => ({ id: c.id, name: c.names, ports: c.ports })),
    }))
  )

  // If nothing changed since last print, skip output
  if (snapshotKey === lastSnapshotKey) return
  lastSnapshotKey = snapshotKey

  // If there are no duplicates, print a single status line
  if (duplicateGroups.length === 0) {
    console.log('\n' + '─'.repeat(80))
    console.log(`Monitoring duplicate containers - ${new Date().toLocaleTimeString()}`)
    console.log('No duplicate containers found.')
    return
  }

  // Print duplicate containers
  console.log('\n' + '─'.repeat(80))
  console.log(`Monitoring duplicate containers - ${new Date().toLocaleTimeString()}`)
  console.log('CONTAINER ID'.padEnd(13) + 'CONTAINER NAME'.padEnd(30) + 'RUNTIME'.padEnd(20) + 'PORTS')
  duplicateGroups.forEach(([baseName, containers]) => {
    containers.sort((a, b) => a.names.localeCompare(b.names))
    containers.forEach((row) => {
      console.log(row.id.padEnd(13) + row.names.padEnd(30) + row.runtime.padEnd(20) + row.ports)
    })
  })
}

function main(): void {
  console.log('Monitoring docker ps sorted by container names...')
  // Run displaySortedPs every second
  setInterval(displaySortedPs, 1000)

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log('\nStopped monitoring.')
    process.exit(0)
  })
}

main()
