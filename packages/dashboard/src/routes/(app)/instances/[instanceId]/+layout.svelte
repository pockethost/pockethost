<script lang="ts">
  import { page } from '$app/stores'
  import AlertBar from '$components/AlertBar.svelte'
  import { INSTANCE_ADMIN_URL } from '$src/env'
  import { globalInstancesStore } from '$util/stores'
  import { assert } from 'pockethost/common'
  import { instance } from './store'
  import { client } from '$src/pocketbase-client'
  import { InstanceId } from 'pockethost/common'
  import Toggle from './Toggle.svelte'

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

  $: ({ id } = $instance || {})

  const { updateInstance } = client()

  const handleMaintenanceChange = (id: InstanceId) => (isChecked: boolean) => {
    const maintenance = !isChecked

    // Update the database with the new value
    updateInstance({ id, fields: { maintenance } })
      .then(() => 'saved')
      .catch((error) => {
        error.data.message || error.message
      })
  }

  $: isActive = (path: string) => $page.url.pathname.endsWith(path)
  $: activeClass = (path: string) => (isActive(path) ? 'text-primary' : '')
</script>

<svelte:head>
  <title
    >{isReady ? $instance.subdomain : 'Instance'} overview - PocketHost</title
  >
</svelte:head>

{#if isReady}
  <div class="flex flex-row items-center justify-between mb-6 gap-4">
    <div>
      <h2
        class="text-4xl md:text-left text-center text-base-content font-bold mb-3 break-words"
      >
        {$instance.subdomain}<span class="text-xs text-gray-400"
          >.pockethost.io</span
        >
        <span class="text-xs text-gray-400">v{$instance.version}</span>
      </h2>
    </div>

    <div>
      <Toggle
        title="Power"
        checked={!$instance.maintenance}
        onChange={handleMaintenanceChange($instance.id)}
      />
    </div>
  </div>

  {#if $instance.maintenance}
    <AlertBar
      message="This instance is turned off and will not respond to requests"
      type="warning"
    />
  {/if}

  <div class="flex gap-4">
    <div class="w-48">
      <ul>
        <li>
          <a href={`/instances/${id}`} class={activeClass(id)}>Overview</a>
        </li>
        <li>
          <a href={`/instances/${id}/secrets`} class={activeClass(`secrets`)}
            >Secrets</a
          >
        </li>
        <li>
          <a href={`/instances/${id}/logs`} class={activeClass(`logs`)}>Logs</a>
        </li>
        <li>
          <a href={`/instances/${id}/ftp`} class={activeClass(`ftp`)}
            >FTP Access</a
          >
        </li>
        <li>
          <a
            href={INSTANCE_ADMIN_URL($instance)}
            rel="noreferrer"
            target="_blank"
          >
            <img
              src="/images/pocketbase-logo.svg"
              alt="PocketBase Logo"
              class="w-6 inline-block"
            />
            Admin
            <i class="fa-solid fa-external-link-alt text-xs"></i>
          </a>
        </li>
      </ul>
      <div class="divider"></div>
      <div class="mt-2 mb-2">
        <i class="fa-solid fa-siren-on text-error"></i>
        <span class=" font-bold text-error">Danger Zone</span>
        <i class="fa-solid fa-siren-on text-error"></i>
      </div>
      <ul>
        <li><a href={`/instances/${id}/version`}>Change Version</a></li>
        <li><a href={`/instances/${id}/domain`}>Custom Domain</a></li>
        <li><a href={`/instances/${id}/admin-sync`}>Admin Sync</a></li>
        <li><a href={`/instances/${id}/dev`}>Dev Mode</a></li>
        <li><a href={`/instances/${id}/rename`}>Rename</a></li>
        <li>
          <a href={`/instances/${id}/delete`} class="btn btn-error btn-xs"
            >Delete</a
          >
        </li>
      </ul>
    </div>

    <div class="w-full">
      {#key $page.url.pathname}
        <article class="prose">
          <slot />
        </article>
      {/key}
    </div>
  </div>
{:else}
  <div>Instance not found</div>
{/if}
