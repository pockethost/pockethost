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
  import InstanceRuntimeBadge from '$components/InstanceRuntimeBadge.svelte'
  import { isInstanceFullyOff, isInstanceShuttingDown } from '$util/instancePower'
  import Logo from '$src/routes/Navbar/Logo.svelte'

  let isReady = false
  let sidebarOpen = false
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
  $: isShuttingDown = $instance ? isInstanceShuttingDown($instance) : false
  $: isFullyOff = $instance ? isInstanceFullyOff($instance) : false

  const { updateInstance } = client()

  const handlePowerChange = (id: InstanceId) => (isChecked: boolean) => {
    const power = isChecked

    updateInstance({ id, fields: { power } })
      .then(() => 'saved')
      .catch((error) => {
        error.data.message || error.message
      })
  }

  function handleCloseSidebar(event: MouseEvent) {
    const target = event.target as HTMLElement
    if (window.innerWidth < 768 && target.closest('a')) {
      sidebarOpen = false
    }
  }

  $: isActive = (path: string) => $page.url.pathname.endsWith(path)
  $: activeClass = (path: string) => (isActive(path) ? 'text-secondary' : '')
</script>

<svelte:head>
  <title>{isReady ? $instance.subdomain : 'Instance'} overview - PocketHost</title>
</svelte:head>

{#if isReady}
  <div class="hidden md:flex flex-row items-center justify-between py-6 mb-6 border-b border-white/10 relative">
    <div>
      <div class="flex flex-col items-start md:items-center gap-1 md:gap-3 md:flex-row">
        <h2 class="text-2xl md:text-4xl md:text-left text-white font-bold break-words">
          {$instance.subdomain}
        </h2>
        <div class="flex items-center justify-center gap-2">
          <a
            href={`/instances/${$instance.id}/version`}
            class="bg-gray-500/20 text-gray-300 border border-gray-500/50 text-xs px-2 py-1 rounded-full"
          >
            v{$instance.version}
          </a>
          <InstanceRuntimeBadge instance={$instance} />
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
    </div>

    <div>
      <Toggle
        checked={$instance.power}
        loading={isShuttingDown}
        disabled={isShuttingDown}
        onChange={handlePowerChange($instance.id)}
      />
    </div>
  </div>

  {#if isShuttingDown}
    <div class="mb-8 hidden md:block">
      <AlertBar message="Shutting down instance. This usually takes a few seconds." type="warning" />
    </div>
  {:else if isFullyOff}
    <div class="mb-8 hidden md:block">
      <AlertBar message="This instance is turned off and will not respond to requests." type="warning" />
    </div>
  {/if}

  <div class="flex gap-4 flex-col md:flex-row relative">
    <div
      class="flex md:hidden items-center sticky top-0 gap-2 from-[#111111] to-[#111111]/40 bg-gradient-to-b shadow-md justify-between py-3 mb-0 border-b border-white/10 z-50"
    >
      <div class="flex items-center gap-3 min-w-0">
        <button onclick={() => (sidebarOpen = !sidebarOpen)} class="flex-shrink-0">
          <wa-icon name="bars"></wa-icon>
        </button>

        <h2 class="text-lg font-bold text-white min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span class="truncate">{$instance.subdomain}</span>
          <InstanceRuntimeBadge instance={$instance} />
          {#if $instance.dev}
            <a
              href={`/instances/${$instance.id}/dev`}
              class="text-warning animate-pulse text-xl ml-1 flex-shrink-0"
              title="Dev Mode Active (SLOW)"
            >
              🚧
            </a>
          {/if}
        </h2>
      </div>

      <div class="flex-shrink-0">
        <Toggle
          checked={$instance.power}
          loading={isShuttingDown}
          disabled={isShuttingDown}
          onChange={handlePowerChange($instance.id)}
        />
      </div>
    </div>

    {#if isShuttingDown}
      <div class="mb-4 md:hidden px-1">
        <AlertBar message="Shutting down instance. This usually takes a few seconds." type="warning" />
      </div>
    {:else if isFullyOff}
      <div class="mb-4 md:hidden px-1">
        <AlertBar message="This instance is turned off and will not respond to requests." type="warning" />
      </div>
    {/if}

    {#if sidebarOpen && window.innerWidth < 768}
      <div class="fixed inset-0 bg-black bg-opacity-50 z-50 backdrop-blur-sm" onclick={() => (sidebarOpen = false)}></div>
    {/if}

    <div
      class="flex flex-col w-56 md:relative fixed md:top-auto top-0 left-0 h-full bg-[#111111] md:bg-transparent px-4 md:px-0 z-50 transform transition-transform duration-300 md:translate-x-0"
      class:-translate-x-full={!sidebarOpen && window.innerWidth < 768}
      onclick={handleCloseSidebar}
      role="presentation"
    >
      <nav class="flex flex-col gap-1 text-white mb-6">
        <div class="md:hidden flex items-start py-2">
          <Logo />
        </div>
        <a href={`/instances/${id}`} class="px-2 py-1 rounded hover:bg-white/10 {activeClass(id)}">Overview</a>
        <a href={`/instances/${id}/secrets`} class="px-2 py-1 rounded hover:bg-white/10 {activeClass(`secrets`)}"
          >Secrets</a
        >
        <a href={`/instances/${id}/webhooks`} class="px-2 py-1 rounded hover:bg-white/10 {activeClass(`webhooks`)}"
          >Webhooks</a
        >
        <a href={`/instances/${id}/logs`} class="px-2 py-1 rounded hover:bg-white/10 {activeClass(`logs`)}">Logs</a>
        <a href={`/instances/${id}/ftp`} class="px-2 py-1 rounded hover:bg-white/10 {activeClass(`ftp`)}">SFTP</a>
        <a
          href={INSTANCE_ADMIN_URL($instance)}
          rel="noreferrer"
          target="_blank"
          class="px-2 py-1 rounded hover:bg-white/10 flex items-center gap-2"
        >
          <img src="/images/pocketbase-logo.svg" alt="PocketBase Logo" class="w-6 inline-block" />
          Admin
          <wa-icon name="arrow-up-right-from-square" class="ml-2 text-xs"></wa-icon>
        </a>
      </nav>

      <div class="mb-2">
        <wa-icon name="triangle-exclamation" class="text-error inline"></wa-icon>
        <span class="font-bold text-error">Danger Zone</span>
        <wa-icon name="triangle-exclamation" class="text-error inline"></wa-icon>
      </div>

      <nav class="flex flex-col gap-1 text-white">
        <a href={`/instances/${id}/version`} class="px-2 py-1 rounded hover:bg-white/10 {activeClass(`version`)}"
          >Change Version</a
        >
        <a href={`/instances/${id}/domain`} class="px-2 py-1 rounded hover:bg-white/10 {activeClass(`domain`)}"
          >Custom Domain</a
        >
        <a href={`/instances/${id}/admin-sync`} class="px-2 py-1 rounded hover:bg-white/10 {activeClass(`admin-sync`)}"
          >Admin Sync</a
        >
        <a href={`/instances/${id}/auto-vacuum`} class="px-2 py-1 rounded hover:bg-white/10 {activeClass(`auto-vacuum`)}"
          >Auto Vacuum</a
        >
        <a href={`/instances/${id}/dev`} class="px-2 py-1 rounded hover:bg-white/10 {activeClass(`dev`)}">Dev Mode</a>
        <a href={`/instances/${id}/rename`} class="px-2 py-1 rounded hover:bg-white/10 {activeClass(`rename`)}"
          >Rename</a
        >
        <a
          href={`/instances/${id}/delete`}
          class="px-2 py-1 rounded hover:bg-white/10 text-error {activeClass(`delete`)}">Delete</a
        >
      </nav>
    </div>

    <div class="flex-1 min-w-0 max-w-content">
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
