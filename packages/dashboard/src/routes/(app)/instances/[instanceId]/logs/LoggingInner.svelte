<script lang="ts">
  import { client } from '$src/pocketbase-client'
  import { mkCleanup } from '$util/componentCleanup'
  import { StreamNames, type Unsubscribe, type InstanceLogFields } from 'pockethost/common'
  import { onMount, tick } from 'svelte'
  import { derived, writable } from 'svelte/store'
  import { instance } from '../store'
  import CardHeader from '$src/components/cards/CardHeader.svelte'
  import Fa from 'svelte-fa'
  import { faArrowDown, faClose, faUpRightAndDownLeftFromCenter } from '@fortawesome/free-solid-svg-icons'

  $: ({ id } = $instance)

  // This takes in a log type and returns a specific text color
  const logColor = (type: StreamNames) => {
    if (type === StreamNames.StdOut) return 'text-neutral-content'
    if (type === StreamNames.StdErr) return 'text-error'

    return 'text-info'
  }

  // This will take in the log message and return either the message or a string
  const logText = (log: any) => {
    try {
      const parsed = JSON.parse(log.message)
      // Split on newlines and join with <br> tags
      return parsed.split('\n').join('<br>')
    } catch (e) {
      return log.message.split('\n').join('<br>')
    }
  }

  // This will open the full screen modal
  const handleFullScreenModal = () => {
    const modal = document.getElementById('loggingFullscreenModal') as HTMLDialogElement
    modal?.showModal()
  }

  // Auto Scrolls The Logs Window as New Logs Are Appended
  // -----------------------------------------------------

  let logElement: Element
  let logElementPopup: Element

  let autoScroll: boolean = true

  const scrollToBottom = (node: Element) => {
    if (node) {
      node.scroll({ top: node.scrollHeight, behavior: 'smooth' })
    }
  }

  $: if ($logs && autoScroll) {
    tick().then(() => {
      if (logElement) scrollToBottom(logElement)
      if (logElementPopup) scrollToBottom(logElementPopup)
    })
  }

  // -----------------------------------------------------

  const logs = writable<InstanceLogFields[]>([])

  const onDestroy = mkCleanup()

  const instanceId = derived(instance, (instance) => instance.id)

  onMount(async () => {
    let unwatch: Unsubscribe | undefined
    const unsub = instanceId.subscribe((id) => {
      unwatch?.()
      logs.set([])
      unwatch = client().watchInstanceLog($instance, (newLog) => {
        logs.update((currentLogs) => {
          return [
            ...currentLogs,
            {
              time: `<no time>`,
              stream: StreamNames.StdOut,
              message: `<no message>`,
              ...newLog,
            },
          ]
        })
      })
    })
    onDestroy(unsub)
    onDestroy(() => unwatch?.())
  })
</script> 

<div>
  <CardHeader>Logs</CardHeader>

<div class="mb-4">
  Instance logs appear here in realtime, including <code>console.log</code> from JavaScript hooks.
</div>

<dialog id="loggingFullscreenModal" class="modal backdrop-blur">
  <div class="modal-box mockup-code max-w-[90vw] h-[90vh]">
    <button class="btn btn-sm absolute top-4 right-4" on:click={() => (autoScroll = !autoScroll)}
      >AutoScroll
      <Fa icon={autoScroll ? faArrowDown : faClose} />
    </button>
    <h3 class="font-bold text-lg pb-4">Instance Logging</h3>

    <div class="h-[70vh] overflow-y-scroll flex flex-col" bind:this={logElementPopup}>
      {#each $logs as log}
        <div class="px-4 text-[16px] font-mono flex align-center" data-prefix=">">
          <div>
            <span class="mr-1 text-light font-mono">{log.time}</span>
            <span class="mr-1 text-base-content font-mono {logColor(log.stream)}">{@html logText(log)}</span> 
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
  <div class="flex flex-row absolute top-4 right-4 gap-1">
    <button class="btn btn-sm" on:click={() => (autoScroll = !autoScroll)}
      >AutoScroll
      <Fa icon={autoScroll ? faArrowDown : faClose} />
    </button>
    <button class="btn btn-sm" on:click={handleFullScreenModal}
      >Fullscreen <Fa icon={faUpRightAndDownLeftFromCenter} /></button
    >
  </div>
  <div class="h-[50vh] flex flex-col overflow-y-scroll" bind:this={logElement}>
    {#each $logs as log}
      <div class="px-4 text-[16px] font-mono flex align-center" data-prefix=">">
        <div>
          <span class="mr-1 text-light font-mono">{log.time}</span>

          <span class="mr-1 text-base-content font-mono {logColor(log.stream)}">{@html logText(log)}</span>
        </div>
      </div>
    {/each}
  </div>
</div>
</div>
