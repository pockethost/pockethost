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
  <div class="flex flex-row items-center justify-between mb-6 gap-4 pl-4 sm:pl-6 lg:pl-8 pr-2">
    <div>
      <h2
        class="text-4xl md:text-left text-base-content font-bold mb-3 break-words"
      >
        {$instance.subdomain}
        
      </h2>
      <span class="text-gray-400">
        Version {$instance.version} - <span class="capitalize">{$instance.status}</span>
      </span>
    </div>
    
    <div>
      <Toggle
        checked={!$instance.maintenance}
        onChange={handleMaintenanceChange($instance.id)}
      />
    </div>
  </div>
  
  {#if $instance.maintenance}
    <div class="px-4 mb-8">
      <AlertBar
        message="This instance is turned off and will not respond to requests"
        type="warning"
      />
    </div>
  {/if}

  <!-- Consistency is key -->
  <div class="flex gap-4 mr-4">
    <div class="flex flex-col w-56">
      <ul class="menu text-base-content mb-6">
        <li>
          <a href={`/app/instances/${id}`} class={`${activeClass(id)}`}>Overview</a>
        </li>
        <li>
          <a
            href={`/app/instances/${id}/secrets`}
            class={activeClass(`secrets`)}>Secrets</a>
        </li>
        <li>
          <a href={`/app/instances/${id}/logs`} class={activeClass(`logs`)}
            >Logs</a
          >
        </li>
        <li>
          <a href={`/app/instances/${id}/ftp`} class={activeClass(`ftp`)}
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
      <div class="pl-6">
        <i class="fa-solid fa-siren-on text-error"></i>
        <span class="font-bold text-error">Danger Zone</span>
        <i class="fa-solid fa-siren-on text-error"></i>
      </div>
      <ul class="menu text-base-content">
        <li><a href={`/app/instances/${id}/version`} class={activeClass(`version`)}>Change Version</a></li>
        <li><a href={`/app/instances/${id}/domain`} class={activeClass(`domain`)}>Custom Domain</a></li>
        <li><a href={`/app/instances/${id}/admin-sync`} class={activeClass(`admin-sync`)}>Admin Sync</a></li>
        <li><a href={`/app/instances/${id}/dev`} class={activeClass(`dev`)}>Dev Mode</a></li>
        <li><a href={`/app/instances/${id}/rename`} class={activeClass(`rename`)}>Rename</a></li>
        <li>
          <a href={`/app/instances/${id}/delete`} class={`text-error ${activeClass(`delete`)}`}
            >Delete</a
          >
        </li>
      </ul>
    </div>

    <div class="w-full">
      {#key $page.url.pathname}
        <article class="flex flex-col gap-4">
          <slot />
        </article>
      {/key}
    </div>
  </div>
{:else}
  <div>Instance not found</div>
{/if}
