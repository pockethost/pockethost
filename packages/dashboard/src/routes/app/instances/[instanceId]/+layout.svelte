<script lang="ts">
  import { page } from '$app/stores'
  import AuthStateGuard from '$components/helpers/AuthStateGuard.svelte'
  import {
    createCleanupManager,
  } from '@pockethost/common'
  import { onDestroy } from 'svelte'
  import { instance } from './store'
  import { getSingleInstance } from '$util/getInstances'

  const cm = createCleanupManager()

  // Run anytime the page params changes
  $: { getSingleInstance($page.params.instanceId) }

  console.log(">>>$instance", $instance)

  onDestroy(() => cm.shutdown())
</script>

<AuthStateGuard>
  {#if $instance}
    <slot />
  {/if}
</AuthStateGuard>
