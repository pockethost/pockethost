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
  import Logo from '$src/routes/Navbar/Logo.svelte'
  import { onMount } from 'svelte'
  import Prism from "prismjs";
  import "prismjs/components/prism-typescript";

  let isReady = false
  let sidebarOpen = false;
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

  function handleCloseSidebar(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (window.innerWidth < 768 && target.closest('a')) {
      sidebarOpen = false;
    }

  }

  $: isActive = (path: string) => $page.url.pathname.endsWith(path)
  $: activeClass = (path: string) => (isActive(path) ? 'text-secondary' : '')

  onMount(() => {
    Prism.highlightAll();
  });

</script>

<svelte:head>
  <title>{isReady ? $instance.subdomain : 'Instance'} overview - PocketHost</title>
</svelte:head>

{#if isReady}
  <div class="hidden md:flex flex-row items-center justify-between py-6 mb-6 border-b border-white/10 relative">
    <div>
      <div class="flex flex-col items-start md:items-center gap-1 md:gap-3  md:flex-row">
        <h2 class="text-2xl md:text-4xl md:text-left text-base-content font-bold break-words">
          {$instance.subdomain}
        </h2>
        <div class="flex items-center justify-center gap-2"> 

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
    </div>

    <div>
      <Toggle checked={$instance.power} onChange={handlePowerChange($instance.id)} />
    </div>
  </div>

  <!-- {#if !$instance.power}
    <div class="mb-8">
      <AlertBar message="This instance is turned off and will not respond to requests" type="warning" />
    </div>
  {/if} -->

  <div class="flex gap-4 flex-col md:flex-row relative">

  <div class="flex md:hidden items-center sticky top-0 gap-2 from-[#111111] to-[#111111]/40 bg-gradient-to-b shadow-md justify-between py-3 mb-0 border-b border-white/10 z-50">
  <div class="flex items-center gap-3 min-w-0">
    <!-- Burger -->
    <button on:click={() => sidebarOpen = !sidebarOpen} class="flex-shrink-0">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none"
        viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>

    <!-- Name -->
    <h2 class="text-lg font-bold text-base-content truncate min-w-0">
      {$instance.subdomain}
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

  <!-- Power Toggle -->
  <div class="flex-shrink-0">
    <Toggle checked={$instance.power} onChange={handlePowerChange($instance.id)} />
  </div>
</div>


  {#if sidebarOpen && window.innerWidth < 768}
  <div
    class="fixed inset-0 bg-black bg-opacity-50 z-50 backdrop-blur-sm"
    on:click={() => sidebarOpen = false}
  ></div>
{/if}

  <div
    class="flex flex-col w-56 md:relative fixed md:top-auto top-0 left-0 h-full bg-[#111111] md:bg-transparent px-4 md:px-0 z-50 transform transition-transform duration-300 md:translate-x-0"
    class:-translate-x-full={!sidebarOpen && window.innerWidth < 768} on:click={handleCloseSidebar} role="presentation"
  >
    <ul class="menu text-base-content mb-6 p-0">
      <li class="md:hidden flex items-start">
        
          <Logo/>
        
      </li>
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

    <div class="mb-2">
      <Fa icon={faTriangleExclamation} class="text-error inline" />
      <span class="font-bold text-error">Danger Zone</span>
      <Fa icon={faTriangleExclamation} class="text-error inline" />
    </div>

    <ul class="menu text-base-content p-0">
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

  <!-- Content -->
  <div class="w-full md:w-[80%] md:mt-0">
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
