<script lang="ts">
  import Protected from '$components/Protected.svelte'
  import ProvisioningStatus from '$components/ProvisioningStatus.svelte'
  import RetroBoxContainer from '$components/RetroBoxContainer.svelte'
  import { PUBLIC_PB_DOMAIN } from '$src/env'
  import { client } from '$src/pocketbase'
  import { createCleanupManagerSync } from '$util/CleanupManager'
  import type { Instance_Out_ByIdCollection } from '@pockethost/common/src/schema'
  import { forEach, values } from '@s-libs/micro-dash'
  import { onDestroy, onMount } from 'svelte'
  import { fade } from 'svelte/transition'

  // Wait for the instance call to complete before rendering the UI
  let hasPageLoaded = false

  const { getAllInstancesById, watchInstanceById } = client
  let apps: Instance_Out_ByIdCollection = {}

  // This will update when the `apps` value changes
  $: isFirstApplication = values(apps).length === 0

  const cm = createCleanupManagerSync()
  let _touch = 0 // This is a fake var because without it the watcher callback will not update UI when the apps object changes
  const _update = (_apps: Instance_Out_ByIdCollection) => {
    apps = _apps
    _touch++
  }
  onMount(() => {
    getAllInstancesById()
      .then((instances) => {
        _update(instances)

        forEach(apps, (app) => {
          const instanceId = app.id

          const unsub = watchInstanceById(instanceId, (r) => {
            console.log(`got a record`, r)
            _update({ ...apps, [r.id]: r })
          })
          cm.add(unsub)
        })
      })
      .catch((e) => {
        console.error(`Failed to fetch instances`)
      })
      .finally(() => {
        hasPageLoaded = true
      })
  })

  onDestroy(cm.cleanupAll)
</script>

<Protected>
  <div class="container" in:fade={{ duration: 30 }}>
    {#if values(apps).length}
      <div class="py-4">
        <h1 class="text-center">Your Apps</h1>
      </div>

      <div class="row justify-content-center">
        {#each values(apps) as app}
          <div class="col-xl-4 col-md-6 col-12 mb-5">
            <div class="card">
              <div class="server-status">
                <ProvisioningStatus status={app.status} />
              </div>

              <h2 class="mb-4 font-monospace">{app.subdomain}</h2>

              <div class="d-flex justify-content-around">
                <a href={`/app/instances/${app.id}`} class="btn btn-light">
                  <i class="bi bi-gear-fill" />
                  <span>Details</span>
                </a>

                <a
                  class="btn btn-light pocketbase-button"
                  href={`https://${app.subdomain}.${PUBLIC_PB_DOMAIN}/_`}
                  target="_blank"
                >
                  <img src="/images/pocketbase-logo.svg" alt="PocketBase Logo" class="img-fluid" />
                  <span>Admin</span>
                </a>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}

    <div class="first-app-screen">
      <RetroBoxContainer minHeight={isFirstApplication ? 500 : 0}>
        <div class="px-lg-5">
          <h2 class="mb-4">Create Your {isFirstApplication ? 'First' : 'Next'} App</h2>
          <a href="/app/new" class="btn btn-primary btn-lg"><i class="bi bi-plus" /> New App</a>
        </div>
      </RetroBoxContainer>
    </div>
  </div>
</Protected>

<style lang="scss">
  .first-app-screen {
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 85px 0;
  }

  .card {
    border: 0;
    padding: 24px;
    box-shadow: var(--soft-box-shadow);
  }

  .server-status {
    position: absolute;
    top: 4px;
    right: 8px;
  }

  .pocketbase-button img {
    max-width: 25px;
  }

  @media screen and (min-width: 768px) {
    .first-app-screen {
      min-height: 70vh;
    }
  }
</style>
