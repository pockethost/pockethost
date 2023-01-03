<script lang="ts">
  import { client } from '$src/pocketbase'
  import { dbg } from '$util/logger'
  import type { InstanceFields, InstanceLogFields, RecordId } from '@pockethost/common'
  import { createCleanupManager } from '@pockethost/common'
  import { values } from '@s-libs/micro-dash'
  import { onDestroy, onMount } from 'svelte'
  import { writable } from 'svelte/store'

  export let instance: InstanceFields

  const { id } = instance

  const logs = writable<{ [_: RecordId]: InstanceLogFields }>({})
  let logsArray: InstanceLogFields[] = []

  const cm = createCleanupManager()
  onMount(async () => {
    dbg(`Watching instance log`)
    const unsub = client().watchInstanceLog(id, (newLog) => {
      dbg(`Got new log`, newLog)
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

<h2>Instance Logging</h2>
<p>
  Instance logs appear here in realtime. They include instance events and errors, and Deno worker
  events and errors.
</p>
<div class="log-window">
  {#each logsArray as log}
    <div class="log">
      <div class="time">{log.created}</div>

      <div class={`stream ${log.stream}`}>{log.stream}</div>
      <div class={`message  ${log.stream}`}>
        {(() => {
          try {
            const parsed = JSON.parse(log.message)
            return `<pre><code>${parsed}</code></pre>`
          } catch (e) {
            return log.message
          }
        })()}
      </div>
    </div>
  {/each}
</div>

<style lang="scss">
  .log-window {
    border: 1px solid gray;
    padding: 5px;
    height: 500px;
    overflow: auto;
    display: flex;
    flex-direction: column-reverse;
    white-space: nowrap;
    .log {
      position: relative;
      font-family: monospace;
      .time {
        color: gray;
        display: inline-block;
      }
      .stream {
        color: gray;
        display: inline-block;
        &.system {
          color: orange;
        }
        &.info {
          color: blue;
        }
        &.error {
          color: red;
        }
      }
      .message {
        display: inline-block;
      }
    }
  }
</style>
