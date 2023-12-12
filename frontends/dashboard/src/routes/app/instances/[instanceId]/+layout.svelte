<script>
  import { page } from '$app/stores'
  import AlertBar from '$components/AlertBar.svelte'
  import { assert } from '$shared'
  import { INSTANCE_ADMIN_URL } from '$src/env'
  import { globalInstancesStore } from '$util/stores'
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

  console.log($page.url)

  $: ({ status, version, id } = $instance || {})
</script>

{#if isReady}
  <div
    class="flex md:flex-row flex-col items-center justify-between mb-6 gap-4"
  >
    <div>
      <h2
        class="text-4xl md:text-left text-center text-base-content font-bold capitalize mb-3 break-words"
      >
        {$instance.subdomain}
      </h2>

      <div class="flex flex-wrap md:justify-start justify-center gap-2">
        <div class="badge badge-accent badge-outline">
          Status: &nbsp;<span class="capitalize">{status}</span>
        </div>

        <div class="badge badge-accent badge-outline">Version: {version}</div>
      </div>
    </div>

    <a
      href={INSTANCE_ADMIN_URL($instance.subdomain)}
      rel="noreferrer"
      target="_blank"
      class="btn btn-primary"
    >
      <img
        src="/images/pocketbase-logo.svg"
        alt="PocketBase Logo"
        class="w-6"
      />
      Admin
    </a>
  </div>

  {#if $instance.maintenance}
    <AlertBar
      message="This instance is in Maintenance Mode and will not respond to requests"
      type="warning"
    />
  {/if}

  <div role="tablist" class="tabs tabs-boxed">
    <a
      role="tab"
      class="tab {$page.url.pathname.endsWith(id) ? `tab-active` : ``}"
      href="/app/instances/{id}">Overview</a
    >
    <a
      role="tab"
      class="tab {$page.url.pathname.endsWith(`logs`) ? `tab-active` : ``}"
      href="/app/instances/{id}/logs">Logs</a
    >
    <a
      role="tab"
      class="tab {$page.url.pathname.endsWith(`secrets`) ? `tab-active` : ``}"
      href="/app/instances/{id}/secrets">Secrets</a
    >
    <a
      role="tab"
      class="tab {$page.url.pathname.endsWith(`settings`) ? `tab-active` : ``}"
      href="/app/instances/{id}/settings">Settings</a
    >
  </div>

  <slot />
{:else}
  <div>Instance not found</div>
{/if}
