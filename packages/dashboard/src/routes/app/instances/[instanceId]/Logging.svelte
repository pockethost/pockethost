<script lang="ts">
  import { client } from '$src/pocketbase'
  import {
    createCleanupManager,
    logger,
    type InstanceLogFields,
    type RecordId,
  } from '@pockethost/common'
  import { values } from '@s-libs/micro-dash'
  import { onDestroy, onMount } from 'svelte'
  import { writable } from 'svelte/store'
  import { instance } from './store'
  import Card from '$components/cards/Card.svelte'
  import CardHeader from '$components/cards/CardHeader.svelte'

  const { dbg, trace } = logger().create(`Logging.svelte`)

  $: ({ id } = $instance)

  // This takes in a log type and returns a specific text color
  const logColor = (type: string) => {
    if (type === 'system') return 'text-success'
    if (type === 'info') return 'text-info'
    if (type === 'error') return 'text-error'

    return 'text-info'
  }

  // This will take in the log message and return either the message or a string
  const logText = (log: any) => {
    try {
      return JSON.parse(log.message)
    } catch (e) {
      return log.message
    }
  }

  const logs = writable<{ [_: RecordId]: InstanceLogFields }>({})
  let logsArray: InstanceLogFields[] = []

  const cm = createCleanupManager()

  onMount(async () => {
    dbg(`Watching instance log`)

    const unsub = client().watchInstanceLog(id, (newLog) => {
      trace(`Got new log`, newLog)

      logs.update((currentLogs) => {
        return { ...currentLogs, [newLog.id]: newLog }
      })

      logsArray = values($logs)
        .sort((a, b) => (a.created > b.created ? 1 : -1))
        .slice(0, 1000)
        .reverse()
    })

    cm.add(unsub)
  })

  onDestroy(cm.shutdown)
</script>

<Card>
  <CardHeader>Instance Logging</CardHeader>

  <p class="mb-4">
    Instance logs appear here in realtime, including <code>console.log</code> from
    JavaScript hooks.
  </p>

  <div class="mockup-code">
    <div class="h-[450px] flex flex-col-reverse overflow-y-scroll">
      {#each logsArray as log}
        <div class="px-4" data-prefix=">">
          <span class="text-xs mr-2"
            ><i class="fa-regular fa-angle-right"></i></span
          >
          <span class="text-xs mr-1">{log.created}</span>
          <span class={`text-xs mr-1 font-bold ${logColor(log.stream)}`}
            >{log.stream}</span
          >
          <span class="text-xs mr-1 text-base-content">{logText(log)}</span>
        </div>
      {/each}
    </div>
  </div>
</Card>
