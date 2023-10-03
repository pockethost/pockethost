<script lang="ts">
  import { page } from '$app/stores'
  import AuthStateGuard from '$components/helpers/AuthStateGuard.svelte'
  import { getSingleInstance } from '$util/getInstances'
  import { createCleanupManager } from '@pockethost/common'
  import { onDestroy } from 'svelte'
  import { instance } from './store'

  const cm = createCleanupManager()

  // Run anytime the page params changes
  $: {
    getSingleInstance($page.params.instanceId)
  }

  onDestroy(() => cm.shutdown())
</script>

<AuthStateGuard>
  {#if $instance}
    <slot />
  {/if}
</AuthStateGuard>
