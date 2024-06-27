<script lang="ts">
  import { client } from '$src/pocketbase-client'
  import { mkCleanup } from '$util/componentCleanup'
  import {
    StreamNames,
    Unsubscribe,
    type InstanceLogFields,
  } from 'pockethost/common'
  import { onMount, tick } from 'svelte'
  import { derived, writable } from 'svelte/store'
  import { instance } from '../store'

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
          return [...currentLogs, newLog]
        })
      })
    })
    onDestroy(unsub)
    onDestroy(() => unwatch?.())
  })
</script>

<p class="mb-4">
  Instance logs appear here in realtime, including <code>console.log</code> from
  JavaScript hooks.
</p>

<dialog id="loggingFullscreenModal" class="modal backdrop-blur">
  <div class="modal-box max-w-[90vw] h-[90vh]">
    <button
      class="btn btn-sm absolute top-[6px] right-[6px]"
      on:click={() => (autoScroll = !autoScroll)}
      >AutoScroll
      <i
        class="fa-regular"
        class:fa-close={!autoScroll}
        class:fa-arrow-down={autoScroll}
      />
    </button>
    <h3 class="font-bold text-lg">Instance Logging</h3>

    <div
      class="py-4 h-[80vh] overflow-y-scroll flex flex-col"
      bind:this={logElementPopup}
    >
      {#each $logs as log}
        <div
          class="px-4 text-[11px] font-mono flex align-center"
          data-prefix=">"
        >
          <div>
            <span class="mr-1 text-accent">{log.time}</span>
            <span class="mr-1 text-base-content {logColor(log.stream)}"
              >{logText(log)}</span
            >
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
  <div class="flex flex-row absolute top-[6px] right-[6px] gap-1">
    <button class="btn btn-sm" on:click={() => (autoScroll = !autoScroll)}
      >AutoScroll
      <i
        class="fa-regular"
        class:fa-close={!autoScroll}
        class:fa-arrow-down={autoScroll}
      />
    </button>
    <button class="btn btn-sm" on:click={handleFullScreenModal}
      >Fullscreen <i class="fa-regular fa-arrows-maximize" /></button
    >
  </div>
  <div class="h-[450px] flex flex-col overflow-y-scroll" bind:this={logElement}>
    {#each $logs as log}
      <div class="px-4 text-[11px] font-mono flex align-center" data-prefix=">">
        <div>
          <span class="mr-1 text-accent">{log.time}</span>

          <span class="mr-1 text-base-content {logColor(log.stream)}"
            >{logText(log)}</span
          >
        </div>
      </div>
    {/each}
  </div>
</div>
