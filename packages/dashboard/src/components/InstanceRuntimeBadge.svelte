<script lang="ts">
  import {
    getInstanceRuntimeState,
    runtimeStateLabel,
    type InstanceRuntimeState,
  } from '$util/instancePower'
  import type { InstanceFields } from 'pockethost/common'

  interface Props {
    instance: Pick<InstanceFields, 'power' | 'status'>
  }

  let { instance }: Props = $props()

  const state = $derived(getInstanceRuntimeState(instance))

  const badgeClass: Record<InstanceRuntimeState, string> = {
    running: 'bg-green-500/20 text-green-400 border-green-500/30',
    sleeping: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    starting: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  }
</script>

{#if state}
  <p
    class="px-2 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1.5 {badgeClass[state]}"
    title={runtimeStateLabel[state]}
  >
    {#if state === 'running'}
      <span class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
    {:else if state === 'starting'}
      <span
        class="inline-block w-3 h-3 border border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin"
      ></span>
    {:else if state === 'sleeping'}
      <span class="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
    {:else if state === 'failed'}
      <wa-icon name="circle-xmark" class="text-xs"></wa-icon>
    {/if}
    {runtimeStateLabel[state]}
  </p>
{/if}
