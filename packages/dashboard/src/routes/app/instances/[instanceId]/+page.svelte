<script lang="ts">
  import { assertExists } from '@pockethost/common'
  import Code from './Code.svelte'
  import UsageChart from './UsageChart.svelte'
  import Ftp from './Ftpx.svelte'
  import Logging from './Logging.svelte'
  import Secrets from './Secrets/Secrets.svelte'
  import { instance } from './store'
  import { PUBLIC_APP_DOMAIN } from '$src/env'
  import DangerZoneTitle from './Danger/DangerZoneTitle.svelte'
  import RenameInstance from './Danger/RenameInstance.svelte'
  import Maintenance from './Danger/Maintenance.svelte'
  import VersionChange from './Danger/VersionChange.svelte'
  import { slide } from 'svelte/transition'

  $: ({ status, version, secondsThisMonth } = $instance)

  assertExists($instance, `Expected instance here`)
  const { subdomain } = $instance
</script>

<svelte:head>
  <title>{subdomain} details - PocketHost</title>
</svelte:head>

<div class="flex md:flex-row flex-col items-center justify-between mb-6 gap-4">
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
      <div class="badge badge-accent badge-outline">
        Usage: {Math.ceil(secondsThisMonth / 60)} mins
      </div>
      <div class="badge badge-accent badge-outline">Version: {version}</div>
    </div>
  </div>

  <a
    href="https://{$instance.subdomain}.{PUBLIC_APP_DOMAIN}/_"
    rel="noreferrer"
    target="_blank"
    class="btn btn-primary"
  >
    <img src="/images/pocketbase-logo.svg" alt="PocketBase Logo" class="w-6" />
    Admin
  </a>
</div>

{#if $instance.maintenance}
  <div transition:slide class="alert alert-warning mb-6">
    <i class="fa-regular fa-triangle-person-digging"></i>
    <span
      >This instance is in Maintenance Mode and will not respond to requests</span
    >
  </div>
{/if}

<div class="grid lg:grid-cols-2 grid-cols-1 gap-4 mb-4">
  <UsageChart />

  <Code />
</div>

<div class="grid lg:grid-cols-3 grid-cols-1 gap-4 mb-16">
  <Ftp />

  <Logging />

  <Secrets />
</div>

<DangerZoneTitle />

<div class="grid lg:grid-cols-3 gap-4 mb-4">
  <RenameInstance />

  <Maintenance />

  <VersionChange />
</div>
