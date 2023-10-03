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

  // This will open the full screen modal
  const handleFullScreenModal = () => {
    const modal = document.getElementById(
      'loggingFullscreenModal',
    ) as HTMLDialogElement
    modal?.showModal()
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

  <dialog id="loggingFullscreenModal" class="modal backdrop-blur">
    <div class="modal-box max-w-[90vw] h-[90vh]">
      <h3 class="font-bold text-lg">Instance Logging</h3>

      <div class="py-4 h-[80vh] overflow-y-scroll flex flex-col-reverse gap-3">
        {#each logsArray as log}
          <div
            class="px-4 text-[11px] font-mono flex align-center"
            data-prefix=">"
          >
            <span class="mr-2"
              ><i class="fa-regular fa-angle-right text-accent"></i></span
            >

            <div>
              <span class="mr-1 text-accent">{log.created}</span>
              <span class={`mr-1 font-bold ${logColor(log.stream)}`}
                >{log.stream}</span
              >
              <span class="mr-1 text-base-content block">{logText(log)}</span>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>

  <div class="mockup-code">
    <button
      class="btn btn-sm absolute top-[6px] right-[6px]"
      on:click={handleFullScreenModal}
      >Fullscreen <i class="fa-regular fa-arrows-maximize"></i></button
    >
    <div class="h-[450px] flex flex-col-reverse overflow-y-scroll gap-3">
      {#each logsArray as log}
        <div
          class="px-4 text-[11px] font-mono flex align-center"
          data-prefix=">"
        >
          <span class="mr-2"
            ><i class="fa-regular fa-angle-right text-accent"></i></span
          >

          <div>
            <span class="mr-1 text-accent">{log.created}</span>
            <span class={`mr-1 font-bold ${logColor(log.stream)}`}
              >{log.stream}</span
            >
            <span class="mr-1 text-base-content block">{logText(log)}</span>
          </div>
        </div>
      {/each}
    </div>
  </div>
</Card>
