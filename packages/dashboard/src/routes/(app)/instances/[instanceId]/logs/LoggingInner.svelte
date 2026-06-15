<script lang="ts">
  import { client } from '$src/pocketbase-client'
  import { mkCleanup } from '$util/componentCleanup'
  import { StreamNames, type Unsubscribe, type InstanceLogFields } from 'pockethost/common'
  import { onMount, tick } from 'svelte'
  import { derived, writable } from 'svelte/store'
  import { instance } from '../store'

  $: ({ id } = $instance)

  const logColor = (type: StreamNames) => {
    if (type === StreamNames.StdOut) return 'text-neutral-content'
    if (type === StreamNames.StdErr) return 'text-error'
    return 'text-info'
  }

  const logText = (log: any) => {
    try {
      const parsed = JSON.parse(log.message)
      return parsed.split('\n').join('<br>')
    } catch (e) {
      return log.message.split('\n').join('<br>')
    }
  }

  const handleFullScreenModal = () => {
    const modal = document.getElementById('loggingFullscreenModal') as HTMLDialogElement
    modal?.showModal()
  }

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
  <dialog
    id="loggingFullscreenModal"
    class="backdrop-blur bg-neutral-800 rounded-lg border border-white/10 p-6 max-w-[90vw] h-[90vh]"
  >
    <div class="relative max-w-[90vw] h-[90vh]">
      <wa-button
        class="absolute top-4 right-4"
        variant="neutral"
        size="small"
        onclick={() => (autoScroll = !autoScroll)}
      >
        AutoScroll
        <wa-icon slot="end" name={autoScroll ? 'arrow-down' : 'xmark'}></wa-icon>
      </wa-button>
      <h3 class="font-bold text-lg pb-4">Instance Logging</h3>

      <div
        class="h-[70vh] overflow-y-scroll flex flex-col font-mono bg-black/40 rounded p-2"
        bind:this={logElementPopup}
      >
        {#each $logs as log}
          <div class="px-4 text-[16px] flex align-center" data-prefix=">">
            <div>
              <span class="mr-1 text-light font-mono">{log.time}</span>
              <span class="mr-1 text-white font-mono {logColor(log.stream)}">{@html logText(log)}</span>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <form method="dialog" class="mt-4">
      <wa-button type="submit" variant="neutral" size="small">close</wa-button>
    </form>
  </dialog>

  <div class="mockup-code relative">
    <div class="flex flex-row absolute top-4 right-4 gap-1">
      <wa-button variant="neutral" size="small" onclick={() => (autoScroll = !autoScroll)}>
        AutoScroll
        <wa-icon slot="end" name={autoScroll ? 'arrow-down' : 'xmark'}></wa-icon>
      </wa-button>
      <wa-button variant="neutral" size="small" onclick={handleFullScreenModal}>
        Fullscreen
        <wa-icon slot="end" name="up-right-and-down-left-from-center"></wa-icon>
      </wa-button>
    </div>
    <div class="h-[50vh] flex flex-col overflow-y-scroll" bind:this={logElement}>
      {#each $logs as log}
        <div class="px-4 text-[16px] font-mono flex align-center" data-prefix=">">
          <div>
            <span class="mr-1 text-light font-mono">{log.time}</span>
            <span class="mr-1 text-white font-mono {logColor(log.stream)}">{@html logText(log)}</span>
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>
