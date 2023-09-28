<script lang="ts">
  import { browser } from '$app/environment'
  import AuthStateGuard from '$components/helpers/AuthStateGuard.svelte'
  import ProvisioningStatus from '$components/ProvisioningStatus.svelte'
  import { PUBLIC_APP_DOMAIN } from '$src/env'
  import { client } from '$src/pocketbase'
  import {
    logger,
    type InstanceFields,
    type InstanceId,
    type InstanceRecordsById,
  } from '@pockethost/common'
  import { values } from '@s-libs/micro-dash'
  import { onDestroy, onMount } from 'svelte'
  import { writable } from 'svelte/store'
  import { fade } from 'svelte/transition'

  const { error } = logger()
  let apps: InstanceRecordsById = {}

  const instancesStore = writable<{ [_: InstanceId]: InstanceFields }>({})
  $: isFirstApplication = values($instancesStore).length === 0

  onMount(() => {
    if (browser) {
      ;(async () => {
        const { getAllInstancesById } = client()
        const instances = await getAllInstancesById()
        instancesStore.set(instances)

        console.log({ instances })
        client()
          .client.collection('instances')
          .subscribe<InstanceFields>('*', (data) => {
            instancesStore.update((instances) => {
              instances[data.record.id] = data.record
              return instances
            })
          })
      })().catch(error)
    }
  })

  onDestroy(() => {
    if (browser) {
      client().client.collection('instances').unsubscribe('*').catch(error)
    }
  })
</script>

<svelte:head>
  <title>Dashboard - PocketHost</title>
</svelte:head>

<AuthStateGuard>
  <div class="m-3" in:fade={{ duration: 30 }}>
    {#if !isFirstApplication}
      <div class="text-4xl">Your Apps</div>

      <a href="/app/new" class="m-3 btn btn-primary btn-lg">+ New App</a>

      <div class="flex flex-wrap">
        {#each values($instancesStore) as app}
          <div class="card m-3 w-96 bg-base-100 shadow-xl">
            <div class="card-body">
              <h2 class="card-title">{app.subdomain}</h2>
              <div
                class="server-status d-flex align-items-center justify-content-between"
              >
                <div class="server-status-minutes">
                  Usage: {Math.ceil(app.secondsThisMonth / 60)} mins
                  {#if app.maintenance}
                    <span class="text-warning">Maintenance Mode</span>
                  {/if}
                </div>

                <div
                  class="d-flex align-items-center gap-3 server-status-minutes"
                >
                  {app.version}
                  <ProvisioningStatus status={app.status} />
                </div>
              </div>
              <div class="card-actions justify-center">
                <a href={`/app/instances/${app.id}`} class="btn btn-light">
                  <i class="bi bi-gear-fill" />
                  <span>Details</span>
                </a>
                <a
                  class="btn btn-light pocketbase-button"
                  href={`https://${app.subdomain}.${PUBLIC_APP_DOMAIN}/_`}
                  target="_blank"
                >
                  <img
                    src="/images/pocketbase-logo.svg"
                    alt="PocketBase Logo"
                    class="img-fluid"
                  />
                  <span>Admin</span>
                </a>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div></AuthStateGuard
>
