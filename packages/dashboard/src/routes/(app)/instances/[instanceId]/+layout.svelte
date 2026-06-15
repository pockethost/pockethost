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

  $: pathname = $page.url.pathname
  $: base = `/instances/${id}`
  $: isOverviewActive = pathname === base || pathname === `${base}/`
  $: sectionActive = (section: string) => pathname.startsWith(`${base}/${section}`)
  $: navClass = (active: boolean) =>
    active ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white hover:bg-white/5'
</script>

<svelte:head>
  <title>{isReady ? $instance.subdomain : 'Instance'} overview - PocketHost</title>
</svelte:head>

{#if isReady}
  <div class="max-w-4xl mx-auto py-4 md:py-8">
    <div
      class="flex md:hidden items-center sticky top-0 gap-3 from-[#111111] to-[#111111]/40 bg-gradient-to-b shadow-md py-3 mb-4 border-b border-white/10 z-40 -mx-4 px-4 justify-between"
    >
      <div class="flex items-center gap-3 min-w-0">
        <button type="button" onclick={() => (sidebarOpen = !sidebarOpen)} aria-label="Toggle instance menu">
          <wa-icon name="bars"></wa-icon>
        </button>
        <h1 class="text-lg font-bold text-white min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span class="truncate">{$instance.subdomain}</span>
          <InstanceRuntimeBadge instance={$instance} />
          {#if $instance.dev}
            <a
              href={`/instances/${$instance.id}/dev`}
              class="text-warning animate-pulse text-xl flex-shrink-0"
              title="Dev Mode Active (SLOW)"
            >
              🚧
            </a>
          {/if}
        </h1>
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

    <div class="hidden md:flex flex-row items-start justify-between gap-4 mb-6 md:mb-8">
      <div>
        <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 class="text-2xl md:text-3xl font-bold text-white break-words">{$instance.subdomain}</h1>
          <div class="flex items-center gap-2">
            <a
              href={`/instances/${$instance.id}/version`}
              class="text-xs font-medium text-white/60 border border-white/10 bg-white/5 px-2.5 py-1 rounded-full hover:border-white/20 hover:text-white/80 transition-colors"
            >
              v{$instance.version}
            </a>
            <InstanceRuntimeBadge instance={$instance} />
            {#if $instance.dev}
              <a
                href={`/instances/${$instance.id}/dev`}
                class="text-warning animate-pulse text-xl"
                title="Dev Mode Active (SLOW)"
              >
                🚧
              </a>
            {/if}
          </div>
        </div>
      </div>

      <Toggle
        checked={$instance.power}
        loading={isShuttingDown}
        disabled={isShuttingDown}
        onChange={handlePowerChange($instance.id)}
      />
    </div>

    {#if isShuttingDown}
      <div class="mb-4 md:mb-6">
        <AlertBar message="Shutting down instance. This usually takes a few seconds." type="warning" />
      </div>
    {:else if isFullyOff}
      <div class="mb-4 md:mb-6">
        <AlertBar message="This instance is turned off and will not respond to requests." type="warning" />
      </div>
    {/if}

    {#if sidebarOpen}
      <div
        class="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm md:hidden"
        onclick={() => (sidebarOpen = false)}
        role="presentation"
      ></div>
    {/if}

    <div class="flex gap-6 md:gap-8 flex-col md:flex-row relative">
      <aside
        class="flex flex-col w-52 md:w-44 shrink-0 fixed md:relative top-0 left-0 h-full md:h-auto bg-[#111111] md:bg-transparent px-4 md:px-0 z-50 transition-transform duration-300 -translate-x-full md:translate-x-0 pt-4 md:pt-0 overflow-y-auto md:overflow-visible"
        class:translate-x-0={sidebarOpen}
        onclick={handleCloseSidebar}
        role="presentation"
      >
        <div class="md:hidden flex items-center pb-4 mb-2 border-b border-white/10">
          <Logo />
        </div>

        <nav class="flex flex-col gap-1 text-sm font-medium">
          <a
            href={base}
            class="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors {navClass(isOverviewActive)}"
          >
            <wa-icon name="gauge-high" class="text-base opacity-70"></wa-icon>
            Overview
          </a>
          <a
            href={`${base}/secrets`}
            class="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors {navClass(
              sectionActive('secrets')
            )}"
          >
            <wa-icon name="lock" class="text-base opacity-70"></wa-icon>
            Secrets
          </a>
          <a
            href={`${base}/webhooks`}
            class="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors {navClass(
              sectionActive('webhooks')
            )}"
          >
            <wa-icon name="clock" class="text-base opacity-70"></wa-icon>
            Webhooks
          </a>
          <a
            href={`${base}/logs`}
            class="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors {navClass(sectionActive('logs'))}"
          >
            <wa-icon name="scroll" class="text-base opacity-70"></wa-icon>
            Logs
          </a>
          <a
            href={`${base}/ftp`}
            class="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors {navClass(sectionActive('ftp'))}"
          >
            <wa-icon name="folder-open" class="text-base opacity-70"></wa-icon>
            SFTP
          </a>
          <a
            href={INSTANCE_ADMIN_URL($instance)}
            rel="noreferrer"
            target="_blank"
            class="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-white/70 hover:text-white hover:bg-white/5"
          >
            <img src="/images/pocketbase-logo.svg" alt="" class="w-4 h-4 opacity-70" />
            Admin
            <wa-icon name="arrow-up-right-from-square" class="text-xs opacity-50 ml-auto"></wa-icon>
          </a>
        </nav>

        <p class="text-xs font-semibold uppercase tracking-wide text-white/40 px-3 pt-5 pb-1">Advanced</p>

        <nav class="flex flex-col gap-1 text-sm font-medium">
          <a
            href={`${base}/version`}
            class="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors {navClass(
              sectionActive('version')
            )}"
          >
            <wa-icon name="code-branch" class="text-base opacity-70"></wa-icon>
            Version
          </a>
          <a
            href={`${base}/domain`}
            class="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors {navClass(sectionActive('domain'))}"
          >
            <wa-icon name="globe" class="text-base opacity-70"></wa-icon>
            Custom Domain
          </a>
          <a
            href={`${base}/admin-sync`}
            class="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors {navClass(
              sectionActive('admin-sync')
            )}"
          >
            <wa-icon name="arrows-rotate" class="text-base opacity-70"></wa-icon>
            Admin Sync
          </a>
          <a
            href={`${base}/auto-vacuum`}
            class="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors {navClass(
              sectionActive('auto-vacuum')
            )}"
          >
            <wa-icon name="broom" class="text-base opacity-70"></wa-icon>
            Auto Vacuum
          </a>
          <a
            href={`${base}/dev`}
            class="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors {navClass(sectionActive('dev'))}"
          >
            <wa-icon name="code" class="text-base opacity-70"></wa-icon>
            Dev Mode
          </a>
          <a
            href={`${base}/rename`}
            class="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors {navClass(sectionActive('rename'))}"
          >
            <wa-icon name="pen" class="text-base opacity-70"></wa-icon>
            Rename
          </a>
          <a
            href={`${base}/delete`}
            class="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors {sectionActive('delete')
              ? 'bg-error/15 text-error'
              : 'text-error/70 hover:text-error hover:bg-error/10'}"
          >
            <wa-icon name="trash" class="text-base opacity-70"></wa-icon>
            Delete
          </a>
        </nav>
      </aside>

      <div class="flex-1 min-w-0 max-w-2xl">
        {#key pathname}
          <slot />
        {/key}
      </div>
    </div>
  </div>
{:else}
  <div class="max-w-4xl mx-auto py-4 md:py-8 text-white/70">Instance not found</div>
{/if}
