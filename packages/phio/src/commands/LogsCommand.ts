import { fetchEventSource } from '../lib/fetchEventSource.js'
import { Command } from 'commander'
import { savedInstanceName } from '../lib/defaultInstanceId'
import { ensureLoggedIn } from '../lib/ensureLoggedIn'
import { getClient, getInstanceBySubdomainCnameOrId } from '../lib/getClient'

export enum StreamNames {
  StdOut = 'stdout',
  StdErr = 'stderr',
}

export type InstanceLogFields = {
  message: string
  time: string
  stream: StreamNames
}

type EventSourceMessage = {
  data: string
}

type Unsubscribe = () => void

/**
 * Watches instance logs and streams them to the provided update callback
 *
 * @param instanceName - The instance ID or subdomain to watch logs for
 * @param update - Callback function that will receive log entries
 * @param nInitial - Number of initial log entries to fetch
 * @returns A tuple with [promise that resolves when streaming ends, function to unsubscribe]
 */
const watchInstanceLog = async (
  instanceName: string,
  update: (log: InstanceLogFields) => void,
  nInitial = 100
): Promise<[Promise<void>, Unsubscribe]> => {
  const controller = new AbortController()
  const signal = controller.signal
  let isAborting = false
  let retryTimeout: ReturnType<typeof setTimeout> | null = null

  await ensureLoggedIn()
  const client = await getClient()

  try {
    await getInstanceBySubdomainCnameOrId(instanceName)
  } catch (e) {
    throw new Error(`Instance "${instanceName}" not found.`)
  }

  // Function to clear any pending timeouts
  const clearPendingTimeouts = () => {
    if (retryTimeout) {
      clearTimeout(retryTimeout)
      retryTimeout = null
    }
  }

  // Create promise that will resolve when streaming ends
  const streamingPromise = new Promise<void>((resolve, reject) => {
    signal.addEventListener('abort', () => {
      clearPendingTimeouts()
      resolve()
    })

    const continuallyFetchFromEventSource = () => {
      // Don't attempt to reconnect if we're aborting
      if (isAborting) {
        resolve()
        return
      }

      const url = `https://${instanceName}.pockethost.io/logs`
      const body = {
        instanceId: instanceName,
        n: nInitial,
        auth: client.authStore.exportToCookie(),
      }

      fetchEventSource(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        openWhenHidden: true,
        body: JSON.stringify(body),
        onmessage: (event: EventSourceMessage) => {
          if (isAborting) return
          try {
            const data = JSON.parse(event.data) as InstanceLogFields
            update(data)
          } catch {
            // ignore malformed lines
          }
        },
        onopen: async (response: Response) => {
          if (!response.ok) {
            const error = `Failed to open log stream: ${response.status} ${response.statusText}`
            reject(new Error(error))
          }
        },
        onerror: (e: Error) => {
          if (isAborting) return
          console.error(`Log stream error: ${e}`)

          // Clear any existing timeout before setting a new one
          clearPendingTimeouts()
          retryTimeout = setTimeout(continuallyFetchFromEventSource, 100)
        },
        onclose: () => {
          if (isAborting) return
          console.log(`Log stream closed. Reconnecting...`)

          clearPendingTimeouts()
          retryTimeout = setTimeout(continuallyFetchFromEventSource, 100)
        },
        signal,
      })
    }

    // Start the initial connection
    continuallyFetchFromEventSource()
  })

  // Create clean-up function
  const unsubscribe = () => {
    isAborting = true
    clearPendingTimeouts()
    controller.abort()
  }

  // Add cleanup logic to run when promise completes
  const wrappedPromise = streamingPromise
    .catch((error) => {
      unsubscribe()
      throw error
    })
    .finally(() => {
      clearPendingTimeouts()
    })

  return [wrappedPromise, unsubscribe]
}

/**
 * Creates the logs command
 */
export const LogsCommand = () => {
  return new Command('logs')
    .description('Tail instance logs')
    .argument('[instance]', 'Instance ID', savedInstanceName())
    .option(
      '-n, --lines <number>',
      'Number of initial log lines to show',
      '100'
    )
    .action(async (instance, options) => {
      let running = true
      const nInitial = parseInt(options.lines, 10)

      // Set up signal handling before starting stream
      const cleanup = () => {
        running = false
        console.log('\nStopping log streaming...')

        // We'll set this before unsubscribe is defined, but it will be assigned
        // immediately after watchInstanceLog completes
        if (unsubscribe) unsubscribe()
      }

      // Handle termination signals
      const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGHUP']
      signals.forEach((signal) => process.on(signal, cleanup))

      // Declare unsubscribe variable that will be defined after watchInstanceLog
      let unsubscribe: Unsubscribe | undefined

      try {
        // Start watching logs
        const [streamPromise, unsubscribeFn] = await watchInstanceLog(
          instance,
          (log) => {
            // Only process logs if we're still running
            if (!running) return

            const { time, message, stream } = log
            if (stream === StreamNames.StdErr) {
              console.error(`[${time}] ${message}`)
            } else {
              console.log(`[${time}] ${message}`)
            }
          },
          nInitial
        )

        // Store unsubscribe function for use in cleanup
        unsubscribe = unsubscribeFn

        // Wait for the streaming to end naturally (should only happen on abort)
        await streamPromise
      } catch (err) {
        cleanup()
        throw err
      } finally {
        // Remove signal handlers to prevent memory leaks
        signals.forEach((signal) => process.removeListener(signal, cleanup))
      }
    })
}
