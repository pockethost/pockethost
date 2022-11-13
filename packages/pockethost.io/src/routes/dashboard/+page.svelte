<script lang="ts">
  import { browser } from '$app/environment'
  import AuthStateGuard from '$components/helpers/AuthStateGuard.svelte'
  import ProvisioningStatus from '$components/ProvisioningStatus.svelte'
  import RetroBoxContainer from '$components/RetroBoxContainer.svelte'
  import { PUBLIC_PB_DOMAIN } from '$src/env'
  import { client } from '$src/pocketbase'
  import { createCleanupManagerSync } from '$util/CleanupManager'
  import { humanVersion, type InstanceRecordById, type InstancesRecord } from '@pockethost/common'
  import { forEach, values } from '@s-libs/micro-dash'
  import { onDestroy, onMount } from 'svelte'
  import { fade } from 'svelte/transition'

  let apps: InstanceRecordById = {}

  // This will update when the `apps` value changes
  $: isFirstApplication = values(apps).length === 0

  let appsArray: InstancesRecord[]
  $: {
    appsArray = values(apps)
    // Tooltips must be manually initialized
    // https://getbootstrap.com/docs/5.2/components/tooltips/#enable-tooltips
    if (browser) {
      const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
      const tooltipList = [...tooltipTriggerList].map(
        (tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl)
      )
    }
  }
  const cm = createCleanupManagerSync()
  let _touch = 0 // This is a fake var because without it the watcher callback will not update UI when the apps object changes
  const _update = (_apps: InstanceRecordById) => {
    apps = _apps
    _touch++
  }

  onMount(() => {
    const { getAllInstancesById, watchInstanceById } = client()
    getAllInstancesById()
      .then((instances) => {
        _update(instances)

        forEach(apps, (app) => {
          const instanceId = app.id

          watchInstanceById(instanceId, (r) => {
            const { action, record } = r
            _update({ ...apps, [record.id]: record })
          }).then(cm.add)
        })
      })
      .catch((e) => {
        console.error(`Failed to fetch instances`)
      })
  })

  onDestroy(cm.cleanupAll)
</script>

<svelte:head>
  <title>Dashboard - PocketHost</title>
</svelte:head>

<AuthStateGuard>
  <div class="container" in:fade={{ duration: 30 }}>
    {#if appsArray.length}
      <div class="py-4">
        <h1 class="text-center">Your Apps</h1>
      </div>

      <div class="row justify-content-center">
        {#each appsArray as app}
          <div class="col-xl-4 col-md-6 col-12 mb-5">
            <div class="card">
              <div class="server-status d-flex align-items-center justify-content-between">
                <div class="server-status-minutes">
                  Usage: {Math.ceil(app.secondsThisMonth / 60)} mins
                </div>

                <div class="d-flex align-items-center gap-3">
                  <i
                    class="bi bi-info-circle"
                    data-bs-toggle="tooltip"
                    data-bs-title={`Running ${app.platform} ${humanVersion(
                      app.platform,
                      app.version
                    )}`}
                  />
                  <ProvisioningStatus status={app.status} />
                </div>
              </div>

              <h2 class="mb-4 font-monospace">{app.subdomain}</h2>

              <div class="d-flex justify-content-around">
                <a href={`/app/instances/${app.id}/details`} class="btn btn-light">
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
</AuthStateGuard>

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
    padding: 42px 24px 24px 24px;
    box-shadow: var(--soft-box-shadow);
  }

  .server-status {
    position: absolute;
    top: 8px;
    right: 16px;
    width: calc(100% - 32px);
  }

  .server-status-minutes {
    font-size: 13px;
  }

  .server-status-icons {
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
