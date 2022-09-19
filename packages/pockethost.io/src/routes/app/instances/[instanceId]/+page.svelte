<script lang="ts">
  import { page } from '$app/stores'
  import Button from '$components/Button/Button.svelte'
  import Caption from '$components/Caption/Caption.svelte'
  import CodeSample from '$components/CodeSample.svelte'
  import Protected from '$components/Protected.svelte'
  import ProvisioningStatus from '$components/ProvisioningStatus/ProvisioningStatus.svelte'
  import { ProvisioningSize } from '$components/ProvisioningStatus/types'
  import Title from '$components/Title/Title.svelte'
  import { assertExists } from '@pockethost/common/src/assert'
  import { watchInstanceById } from '@pockethost/common/src/pocketbase'
  import {
    InstanceStatuses,
    type InstanceId,
    type Instance_Out
  } from '@pockethost/common/src/schema'
  import { onDestroy, onMount } from 'svelte'
  import type { Unsubscriber } from 'svelte/store'
  import { identity } from 'ts-brand'

  const { instanceId } = $page.params

  let instance: Instance_Out | undefined

  let url: string
  let code: string = ''
  let unsub: Unsubscriber = () => {}
  onMount(() => {
    unsub = watchInstanceById(identity<InstanceId>(instanceId), (r) => {
      console.log(`got a record`, r)
      instance = r
      assertExists(instance, `Expected instance here`)
      const { subdomain } = instance
      url = `https://${subdomain}.pockethost.io`
      code = `const url = '${url}'\nconst client = new PocketBase(url)`
    })
  })
  onDestroy(() => unsub())
</script>

<Protected>
  <main>
    <Title />
    {#if instance}
      {#if instance.status === InstanceStatuses.Started}
        <ProvisioningStatus status={instance.status} />

        <div>
          Admin URL: <a href={`${url}/_`} target="_blank">{`${url}/_`}</a>
        </div>
        <div>
          JavaScript:
          <CodeSample {code} />
        </div>
      {/if}
      {#if instance.status !== InstanceStatuses.Started}
        <Caption>Please stand by, your instance is starting now...</Caption>
        <div class="provisioning">
          <ProvisioningStatus status={instance.status} size={ProvisioningSize.Hero} />
        </div>
      {/if}
    {/if}
    <Button href="/dashboard">&lt; Back to Dashboard</Button>
  </main>
</Protected>

<style lang="scss">
  main {
    margin: 10px;
    .provisioning {
      text-align: center;
    }
    a {
      text-decoration: initial;
    }
  }
</style>
