<script>
  import { page } from '$app/stores'
  import { globalInstancesStore } from '$util/stores'
  import { assert } from '@pockethost/common'
  import { instance } from './store'

  let isReady = false
  $: {
    const { instanceId } = $page.params
    assert(instanceId)
    const _instance = $globalInstancesStore[instanceId]
    if (_instance) {
      instance.set(_instance)
    }
    isReady = !!_instance
  }
</script>

{#if isReady}
  <slot />
{:else}
  <div>Instance not found</div>
{/if}
