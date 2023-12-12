<script lang="ts">
  import { StreamNames, Unsubscribe, type InstanceLogFields } from '$shared'
  import { client } from '$src/pocketbase-client'
  import { mkCleanup } from '$util/componentCleanup'
  import { onMount } from 'svelte'
  import { derived, writable } from 'svelte/store'
  import { instance } from '../store'

  $: ({ id } = $instance)

  // This takes in a log type and returns a specific text color
  const logColor = (type: StreamNames) => {
    if (type === StreamNames.StdOut) return 'text-info'
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

  const logs = writable<InstanceLogFields[]>([])

  const onDestroy = mkCleanup()

  const instanceId = derived(instance, (instance) => instance.id)

  onMount(async () => {
    let unwatch: Unsubscribe | undefined
    const unsub = instanceId.subscribe((id) => {
      unwatch?.()
      logs.set([])
      unwatch = client().watchInstanceLog(id, (newLog) => {
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
    <h3 class="font-bold text-lg">Instance Logging</h3>

    <div class="py-4 h-[80vh] overflow-y-scroll flex flex-col gap-3">
      {#each $logs as log}
        <div
          class="px-4 text-[11px] font-mono flex align-center"
          data-prefix=">"
        >
          <span class="mr-2"
            ><i class="fa-regular fa-angle-right text-accent"></i></span
          >

          <div>
            <span class="mr-1 text-accent">{log.time}</span>
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
  <div class="h-[450px] flex flex-col overflow-y-scroll gap-3">
    {#each $logs as log}
      <div class="px-4 text-[11px] font-mono flex align-center" data-prefix=">">
        <span class="mr-2"
          ><i class="fa-regular fa-angle-right text-accent"></i></span
        >

        <div>
          <span class="mr-1 text-accent">{log.time}</span>
          <span class={`mr-1 font-bold ${logColor(log.stream)}`}
            >{log.stream}</span
          >
          <span class="mr-1 text-base-content block">{logText(log)}</span>
        </div>
      </div>
    {/each}
  </div>
</div>
