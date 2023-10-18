<script lang="ts">
  import { page } from '$app/stores'
  import AuthStateGuard from '$components/helpers/AuthStateGuard.svelte'
  import { getSingleInstance } from '$util/getInstances'
  import { assertTruthy } from '@pockethost/common'
  import { instance } from './store'

  // Run anytime the page params changes
  $: {
    const { instanceId } = $page.params
    assertTruthy(instanceId)
    getSingleInstance(instanceId)
  }
</script>

<AuthStateGuard>
  {#if $instance}
    <slot />
  {/if}
</AuthStateGuard>
