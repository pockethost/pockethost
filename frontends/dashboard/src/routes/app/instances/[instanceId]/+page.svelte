<script lang="ts">
  import { assertExists } from '$shared'
  import { INSTANCE_ADMIN_URL } from '$src/env'
  import Code from './Code.svelte'
  import AdminSync from './Danger/AdminSync.svelte'
  import DangerZoneTitle from './Danger/DangerZoneTitle.svelte'
  import DeleteInstance from './Danger/DeleteInstance.svelte'
  import Maintenance from './Danger/Maintenance.svelte'
  import RenameInstance from './Danger/RenameInstance.svelte'
  import VersionChange from './Danger/VersionChange/VersionChange.svelte'
  import Ftp from './Ftpx.svelte'
  import Logging from './Logging.svelte'
  import Secrets from './Secrets/Secrets.svelte'
  import { instance } from './store'
  import AlertBar from '$components/AlertBar.svelte'

  $: ({ status, version } = $instance)

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

      <div class="badge badge-accent badge-outline">Version: {version}</div>
    </div>
  </div>

  <a
    href={INSTANCE_ADMIN_URL($instance.subdomain)}
    rel="noreferrer"
    target="_blank"
    class="btn btn-primary"
  >
    <img src="/images/pocketbase-logo.svg" alt="PocketBase Logo" class="w-6" />
    Admin
  </a>
</div>

{#if $instance.maintenance}
  <AlertBar
    message="This instance is in Maintenance Mode and will not respond to requests"
    type="warning"
  />
{/if}

<div class="grid lg:grid-cols-2 grid-cols-1 gap-4 mb-4">
  <Code />
  <Logging />
</div>

<div class="grid lg:grid-cols-2 grid-cols-1 gap-4 mb-16">
  <Ftp />

  <Secrets />
</div>

<DangerZoneTitle />

<div class="grid lg:grid-cols-3 gap-4 mb-4">
  <RenameInstance />

  <Maintenance />

  <VersionChange />

  <AdminSync />

  <DeleteInstance />
</div>
