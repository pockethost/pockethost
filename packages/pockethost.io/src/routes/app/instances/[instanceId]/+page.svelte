<script lang="ts">
  import { page } from '$app/stores'
  import Button from '$components/Button/Button.svelte'
  import Caption from '$components/Caption/Caption.svelte'
  import CodeSample from '$components/CodeSample.svelte'
  import Protected from '$components/Protected.svelte'
  import ProvisioningStatus from '$components/ProvisioningStatus/ProvisioningStatus.svelte'
  import { ProvisioningSize } from '$components/ProvisioningStatus/types'
  import Title from '$components/Title/Title.svelte'
  import { PUBLIC_PB_DOMAIN } from '$env/static/public'
  import { client } from '$src/pocketbase'
  import { assertExists } from '@pockethost/common/src/assert'
  import { InstanceStatus, type Instance_Out } from '@pockethost/common/src/schema'
  import { onDestroy, onMount } from 'svelte'
  import type { Unsubscriber } from 'svelte/store'

  const { instanceId } = $page.params

  let instance: Instance_Out | undefined

  const { watchInstanceById } = client
  let url: string
  let code: string = ''
  let unsub: Unsubscriber = () => {}
  onMount(() => {
    unsub = watchInstanceById(instanceId, (r) => {
      console.log(`got a record`, r)
      instance = r
      assertExists(instance, `Expected instance here`)
      const { subdomain } = instance
      url = `https://${subdomain}.${PUBLIC_PB_DOMAIN}`
      code = `const url = '${url}'\nconst client = new PocketBase(url)`
    })
  })
  onDestroy(() => unsub())
  const isRunning = (instance: Instance_Out) =>
    instance.status === InstanceStatus.Running || instance.status === InstanceStatus.Idle
</script>

<Protected>
  <main>
    <Title />
    {#if instance}
      {#if isRunning(instance)}
        <ProvisioningStatus status={instance.status} />

        <div>
          Admin URL: <a href={`${url}/_`} target="_blank">{`${url}/_`}</a>
        </div>
        <div>
          JavaScript:
          <CodeSample {code} />
        </div>
      {/if}
      {#if !isRunning}
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
