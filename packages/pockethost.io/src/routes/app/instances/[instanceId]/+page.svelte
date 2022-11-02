<script lang="ts">
  import { page } from '$app/stores'
  import CodeSample from '$components/CodeSample.svelte'
  import ProvisioningStatus from '$components/ProvisioningStatus.svelte'
  import { PUBLIC_PB_PROTOCOL } from '$env/static/public'
  import { PUBLIC_PB_DOMAIN } from '$src/env'
  import { client } from '$src/pocketbase'
  import { assertExists } from '@pockethost/common/src/assert'
  import type { Instance_Out } from '@pockethost/common/src/schema'
  import { onDestroy, onMount } from 'svelte'
  import type { Unsubscriber } from 'svelte/store'

  const { instanceId } = $page.params

  let instance: Instance_Out | undefined

  let url: string
  let code: string = ''
  let unsub: Unsubscriber = () => {}

  onMount(() => {
    const { watchInstanceById } = client()
    unsub = watchInstanceById(instanceId, (r) => {
      instance = r
      assertExists(instance, `Expected instance here`)
      const { subdomain } = instance
      url = `${PUBLIC_PB_PROTOCOL}://${subdomain}.${PUBLIC_PB_DOMAIN}`
      code = `const url = '${url}'\nconst client = new PocketBase(url)`
    })
  })
  onDestroy(() => unsub())
</script>

<svelte:head>
  <title>Your Instance - PocketHost</title>
</svelte:head>

<div class="container">
  {#if instance}
    <div class="py-4">
      <div class="d-flex gap-3 align-items-center mb-3">
        <h1 class="mb-0">Admin URL</h1>
        <ProvisioningStatus status={instance.status} />
      </div>

      <h2><a href={`${url}/_`} target="_blank">{`${url}/_`}</a></h2>
    </div>

    <div>
      JavaScript:
      <CodeSample {code} />
    </div>
  {/if}

  <div class="text-center py-5">
    <a href="/dashboard" class="btn btn-light"
      ><i class="bi bi-arrow-left-short" /> Back to Dashboard</a
    >
  </div>
</div>

<style lang="scss">
</style>
