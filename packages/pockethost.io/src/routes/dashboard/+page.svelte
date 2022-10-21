<script lang="ts">
  import { fade } from 'svelte/transition'
  import Protected from '$components/Protected.svelte'
  import ProvisioningStatus from '$components/ProvisioningStatus/ProvisioningStatus.svelte'
  import { PUBLIC_PB_DOMAIN } from '$env/static/public'
  import { client } from '$src/pocketbase'
  import type { Instance_Out_ByIdCollection } from '@pockethost/common/src/schema'
  import { forEach, values } from '@s-libs/micro-dash'
  import { onDestroy, onMount } from 'svelte'
  import type { Unsubscriber } from 'svelte/store'

  // Wait for the instance call to complete before rendering the UI
  let hasPageLoaded = false

  const { getAllInstancesById, watchInstanceById } = client
  let apps: Instance_Out_ByIdCollection = {}

  // This will update when the `apps` value changes
  $: isFirstApplication = values(apps).length === 0

  let unsubs: Unsubscriber[] = []

  onMount(() => {
    getAllInstancesById()
      .then((instances) => {
        apps = instances

        forEach(apps, (app) => {
          const instanceId = app.id

          const unsub = watchInstanceById(instanceId, (r) => {
            console.log(`got a record`, r)
            apps[r.id] = r
          })
          unsubs.push(unsub)
        })
      })
      .catch((e) => {
        console.error(`Failed to fetch instances`)
      })
      .finally(() => {
        hasPageLoaded = true
      })
  })

  onDestroy(() => {
    unsubs.forEach((u) => u())
  })
</script>

<Protected>
  {#if hasPageLoaded}
    <div class="container" in:fade={{ duration: 30 }}>
      {#if values(apps).length}
        <div class="py-4">
          <h1 class="text-center">Your Apps</h1>
        </div>

        <div class="row justify-content-center">
          {#each values(apps) as app}
            <div class="col-lg-4 col-12 mb-5">
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

      <div class="first-app-screen">
        <div class="fun-border {isFirstApplication && 'fun-border-large'}">
          <div class="px-lg-5">
            <h2 class="mb-4">Create Your {isFirstApplication ? 'First' : 'Next'} App</h2>
            <a href="/app/new" class="btn btn-primary btn-lg"><i class="bi bi-plus" /> New App</a>
          </div>
        </div>
      </div>
    </div>
  {/if}
</Protected>

<style lang="scss">
  .first-app-screen {
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 85px 0;
  }

  .fun-border {
    background-color: #fff;
    box-shadow: blue 0px 0px 0px 2px inset, rgb(255, 255, 255) 10px -10px 0px -3px,
      rgb(31, 193, 27) 10px -10px, rgb(255, 255, 255) 20px -20px 0px -3px,
      rgb(255, 217, 19) 20px -20px, rgb(255, 255, 255) 30px -30px 0px -3px,
      rgb(255, 156, 85) 30px -30px, rgb(255, 255, 255) 40px -40px 0px -3px,
      rgb(255, 85, 85) 40px -40px;
    border: 1px solid #eee;
    border-radius: 25px;
    padding: 30px;
    margin-right: 45px;
    margin-top: 25px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .fun-border-large {
    min-height: 400px;
  }

  .card {
    border: 0;
    padding: 24px;
    box-shadow: rgba(100, 100, 111, 0.2) 0px 7px 29px 0px;
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

    .fun-border {
      margin: 0;
    }
  }
</style>
