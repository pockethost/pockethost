<script lang="ts">
  import { assertExists } from '@pockethost/common'
  import ProvisioningStatus from '$components/ProvisioningStatus.svelte'
  import Code from './Code.svelte'
  import UsageChart from './UsageChart.svelte'
  import Danger from './Danger/Danger.svelte'
  import Ftp from './Ftpx.svelte'
  import Logging from './Logging.svelte'
  import Secrets from './Secrets/Secrets.svelte'
  import { instance } from './store'
  import { PUBLIC_APP_DOMAIN } from '$src/env'



  $: ({ status, version, secondsThisMonth } = $instance)

  assertExists($instance, `Expected instance here`)
  const { subdomain } = $instance
</script>

<svelte:head>
  <title>{subdomain} details - PocketHost</title>
</svelte:head>

<div class='flex items-center justify-between mb-6'>
  <div>
    <h2 class="text-4xl text-base-content font-bold capitalize mb-3">{$instance.subdomain}</h2>

    <div class='flex gap-2'>
      <div class="badge badge-accent badge-outline">Status: &nbsp;<span class='capitalize'>{status}</span></div>
      <div class="badge badge-accent badge-outline">Usage: {Math.ceil(secondsThisMonth / 60)} mins</div>
      <div class="badge badge-accent badge-outline">Version: {version}</div>
    </div>
  </div>


  <a
    href="https://{$instance.subdomain}.{PUBLIC_APP_DOMAIN}/_"
    rel="noreferrer"
    target="_blank"
    class='btn btn-primary'>
    <img
      src="/images/pocketbase-logo.svg"
      alt="PocketBase Logo"
      class="w-6"
    />
    Admin
  </a>
</div>

{#if $instance.maintenance}
  <div class="alert alert-warning mb-6">
    <i class="fa-regular fa-triangle-person-digging"></i>
    <span>This instance is in Maintenance Mode and will not respond to requests</span>
  </div>
{/if}

<div class='grid grid-cols-2 gap-4 mb-4'>
  <div class='grow'>
    <UsageChart />
  </div>

  <div class='grow'>
    <Code />
  </div>
</div>

<Ftp />

<Secrets />

<Logging />

<Danger />