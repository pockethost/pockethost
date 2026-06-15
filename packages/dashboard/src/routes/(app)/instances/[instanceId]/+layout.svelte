<script lang="ts">
  import { page } from '$app/stores'
  import AlertBar from '$components/AlertBar.svelte'
  import TabbedFeatureLayout from '$components/TabbedFeatureLayout.svelte'
  import InstanceRuntimeBadge from '$components/InstanceRuntimeBadge.svelte'
  import { INSTANCE_ADMIN_URL } from '$lib/appEnv'
  import type { FeatureTabNavSection } from '$lib/dashboard/featureTabTypes'
  import { globalInstancesStore } from '$util/stores'
  import { assert } from 'pockethost/common'
  import { instance } from './store'
  import { client } from '$src/pocketbase-client'
  import { type InstanceId } from 'pockethost/common'
  import Toggle from './Toggle.svelte'
  import { isInstanceFullyOff, isInstanceShuttingDown } from '$util/instancePower'

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

  $: pathname = $page.url.pathname
  $: base = `/instances/${id}`
  $: isOverviewActive = pathname === base || pathname === `${base}/`
  $: sectionActive = (section: string) => pathname.startsWith(`${base}/${section}`)

  $: sections = isReady
    ? ([
        {
          items: [
            { href: base, label: 'Overview', icon: 'gauge-high', isActive: isOverviewActive },
            {
              href: `${base}/secrets`,
              label: 'Secrets',
              icon: 'lock',
              isActive: sectionActive('secrets'),
            },
            {
              href: `${base}/webhooks`,
              label: 'Webhooks',
              icon: 'clock',
              isActive: sectionActive('webhooks'),
            },
            { href: `${base}/logs`, label: 'Logs', icon: 'scroll', isActive: sectionActive('logs') },
            { href: `${base}/ftp`, label: 'SFTP', icon: 'folder-open', isActive: sectionActive('ftp') },
            {
              href: INSTANCE_ADMIN_URL($instance),
              label: 'Admin',
              imageSrc: '/images/pocketbase-logo.svg',
              external: true,
            },
          ],
        },
        {
          title: 'Advanced',
          items: [
            {
              href: `${base}/version`,
              label: 'Version',
              icon: 'code-branch',
              isActive: sectionActive('version'),
            },
            {
              href: `${base}/domain`,
              label: 'Custom Domain',
              icon: 'globe',
              isActive: sectionActive('domain'),
            },
            {
              href: `${base}/admin-sync`,
              label: 'Admin Sync',
              icon: 'arrows-rotate',
              isActive: sectionActive('admin-sync'),
            },
            {
              href: `${base}/auto-vacuum`,
              label: 'Auto Vacuum',
              icon: 'broom',
              isActive: sectionActive('auto-vacuum'),
            },
            { href: `${base}/dev`, label: 'Dev Mode', icon: 'code', isActive: sectionActive('dev') },
            { href: `${base}/rename`, label: 'Rename', icon: 'pen', isActive: sectionActive('rename') },
            {
              href: `${base}/delete`,
              label: 'Delete',
              icon: 'trash',
              variant: 'danger',
              isActive: sectionActive('delete'),
            },
          ],
        },
      ] satisfies FeatureTabNavSection[])
    : []
</script>

<svelte:head>
  <title>{isReady ? $instance.subdomain : 'Instance'} overview - PocketHost</title>
</svelte:head>

{#if isReady}
  <TabbedFeatureLayout title={$instance.subdomain} mobileTitle={$instance.subdomain} {sections}>
    <svelte:fragment slot="mobileHeader">
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
    </svelte:fragment>

    <svelte:fragment slot="header">
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
    </svelte:fragment>

    <svelte:fragment slot="toolbar">
      <Toggle
        checked={$instance.power}
        loading={isShuttingDown}
        disabled={isShuttingDown}
        onChange={handlePowerChange($instance.id)}
      />
    </svelte:fragment>

    <svelte:fragment slot="alerts">
      {#if isShuttingDown}
        <AlertBar message="Shutting down instance. This usually takes a few seconds." type="warning" />
      {:else if isFullyOff}
        <AlertBar message="This instance is turned off and will not respond to requests." type="warning" />
      {/if}
    </svelte:fragment>

    {#key pathname}
      <slot />
    {/key}
  </TabbedFeatureLayout>
{:else}
  <div class="max-w-4xl mx-auto py-4 md:py-8 text-white/70">Instance not found</div>
{/if}
