<script lang="ts">
  import { page } from '$app/stores'
  import AlertBar from '$components/AlertBar.svelte'
  import { INSTANCE_ADMIN_URL } from '$src/env'
  import { globalInstancesStore } from '$util/stores'
  import { assert } from 'pockethost/common'
  import { instance } from './store'
  import { client } from '$src/pocketbase-client'
  import { type InstanceId } from 'pockethost/common'
  import Toggle from './Toggle.svelte'
  import Fa from 'svelte-fa'
  import { faExternalLinkAlt, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'

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

  const handlePowerChange = (id: InstanceId) => (isChecked: boolean) => {
    const power = isChecked

    // Update the database with the new value
    updateInstance({ id, fields: { power } })
      .then(() => 'saved')
      .catch((error) => {
        error.data.message || error.message
      })
  }

  $: isActive = (path: string) => $page.url.pathname.endsWith(path)
  $: activeClass = (path: string) => (isActive(path) ? 'text-secondary' : '')
</script>

<svelte:head>
  <title>{isReady ? $instance.subdomain : 'Instance'} overview - PocketHost</title>
</svelte:head>

{#if isReady}
  <div class="flex flex-row items-center justify-between py-6 mb-6 border-b border-white/10">
    <div>
      <div class="flex items-center gap-3">
        <h2 class="text-4xl md:text-left text-base-content font-bold break-words">
          {$instance.subdomain}
        </h2>
        <a href={`/instances/${$instance.id}/version`} class="bg-gray-500/20 text-gray-300 border border-gray-500/50 text-xs px-2 py-1 rounded-full">
          v{$instance.version}
        </a>
        {#if $instance.dev}
          <a
            href={`/instances/${$instance.id}/dev`}
            class="text-warning animate-pulse text-2xl"
            title="Dev Mode Active (SLOW)"
          >
            🚧
          </a>
        {/if}
      </div>
    </div>

    <div>
      <Toggle checked={$instance.power} onChange={handlePowerChange($instance.id)} />
    </div>
  </div>

  {#if !$instance.power}
    <div class="mb-8">
      <AlertBar message="This instance is turned off and will not respond to requests" type="warning" />
    </div>
  {/if}

  <div class="flex gap-4 relative">
    <div class="flex flex-col w-56">
      <ul class="menu text-base-content mb-6 pl-0">
        <li>
          <a href={`/instances/${id}`} class={activeClass(id)}>Overview</a>
        </li>
        <li>
          <a href={`/instances/${id}/secrets`} class={activeClass(`secrets`)}>Secrets</a>
        </li>
        <li>
          <a href={`/instances/${id}/webhooks`} class={activeClass(`webhooks`)}>Webhooks</a>
        </li>
        <li>
          <a href={`/instances/${id}/logs`} class={activeClass(`logs`)}>Logs</a>
        </li>
        <li>
          <a href={`/instances/${id}/ftp`} class={activeClass(`ftp`)}>FTP Access</a>
        </li>
        <li>
          <a href={INSTANCE_ADMIN_URL($instance)} rel="noreferrer" target="_blank">
            <img src="/images/pocketbase-logo.svg" alt="PocketBase Logo" class="w-6 inline-block" />
            Admin
            <Fa icon={faExternalLinkAlt} class="ml-2 text-xs" />
          </a>
        </li>
      </ul>
      <div class="">
        <Fa icon={faTriangleExclamation} class="text-error inline" />
        <span class=" font-bold text-error">Danger Zone</span>
        <Fa icon={faTriangleExclamation} class="text-error inline" />
      </div>
      <ul class="menu text-base-content pl-0">
        <li>
          <a href={`/instances/${id}/version`} class={activeClass(`version`)}>Change Version</a>
        </li>
        <li>
          <a href={`/instances/${id}/domain`} class={activeClass(`domain`)}>Custom Domain</a>
        </li>
        <li>
          <a href={`/instances/${id}/admin-sync`} class={activeClass(`admin-sync`)}>Admin Sync</a>
        </li>
        <li>
          <a href={`/instances/${id}/dev`} class={activeClass(`dev`)}>Dev Mode</a>
        </li>
        <li>
          <a href={`/instances/${id}/rename`} class={activeClass(`rename`)}>Rename</a>
        </li>
        <li>
          <a href={`/instances/${id}/delete`} class={`text-error ${activeClass(`delete`)}`}>Delete</a>
        </li>
      </ul>
    </div>

    <div class="w-[80%]">
      {#key $page.url.pathname}
        <article class="flex flex-col gap-4 w-full">
          <slot />
        </article>
      {/key}
    </div>
  </div>
{:else}
  <div>Instance not found</div>
{/if}
