<script lang="ts">
  import { goto } from '$app/navigation'
  import { INSTANCE_ADMIN_URL } from '$src/env'
  import { client } from '$src/pocketbase-client'
  import Toggle from '../instances/[instanceId]/Toggle.svelte'
  import InstanceRuntimeBadge from '$components/InstanceRuntimeBadge.svelte'
  import { isInstanceShuttingDown } from '$util/instancePower'
  import type { InstanceFields } from 'pockethost/common'

  export let instance: InstanceFields

  $: isShuttingDown = isInstanceShuttingDown(instance)

  const { updateInstance } = client()

  const handlePowerChange = (power: boolean) => {
    updateInstance({ id: instance.id, fields: { power } })
  }

  const openAdmin = (e: Event) => {
    e.stopPropagation()
  }

  const openInstance = () => {
    goto(`/instances/${instance.id}`)
  }

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openInstance()
    }
  }
</script>

<!-- div, not button — avoids WA focus ring + invalid <a> inside <button> -->
<div
  class="flex-1 w-full text-left cursor-pointer transition border border-white/10 rounded-xl shadow-md bg-black/40 md:hover:border-white/20 md:hover:bg-black/50 outline-none focus-visible:ring-2 focus-visible:ring-white/25"
  role="link"
  tabindex="0"
  onclick={openInstance}
  onkeydown={onKeydown}
>
  <div class="w-full flex flex-row items-center justify-between gap-4 p-4 min-h-[5.5rem]">
    <div class="flex flex-col items-start gap-2 flex-1 min-w-0 relative">
      <span class="text-xl text-start font-semibold truncate w-full">
        {instance.cname ? instance.cname : instance.subdomain}
      </span>

      <div class="flex flex-wrap gap-1">
        <a
          href={INSTANCE_ADMIN_URL(instance)}
          target="_blank"
          onclick={openAdmin}
          class="pr-2 py-0.5 rounded-full text-xs hover:underline font-medium flex gap-2 items-center"
          title="Open Admin"
        >
          <img src="/images/pocketbase-logo.svg" alt="PocketBase Logo" class="w-4 h-4" /> Admin
        </a>
        <p class="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
          <span>v{instance.version}</span>
        </p>
        <InstanceRuntimeBadge {instance} />
      </div>
    </div>

    <div class="flex flex-shrink-0 self-center" onclick={(e) => e.stopPropagation()}>
      <Toggle
        checked={instance.power}
        loading={isShuttingDown}
        disabled={isShuttingDown}
        onChange={handlePowerChange}
      />
    </div>
  </div>
</div>
