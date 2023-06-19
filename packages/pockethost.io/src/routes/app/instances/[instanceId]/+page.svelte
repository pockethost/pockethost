<script lang="ts">
  import { PUBLIC_APP_DOMAIN } from '$env/static/public'
  import { PUBLIC_APP_PROTOCOL } from '$src/env'
  import { assertExists } from '@pockethost/common'
  import Code from './Code.svelte'
  import Danger from './Danger/Danger.svelte'
  import Ftp from './Ftpx.svelte'
  import Logging from './Logging.svelte'
  import Overview from './Overview.svelte'
  import Secrets from './Secrets/Secrets.svelte'
  import { instance } from './store'

  assertExists($instance, `Expected instance here`)
  const { subdomain, maintenance } = $instance
  const url = `${PUBLIC_APP_PROTOCOL}://${subdomain}.${PUBLIC_APP_DOMAIN}`
  const code = `const url = '${url}'\nconst client = new PocketBase(url)`
</script>

<svelte:head>
  <title>{subdomain} details - PocketHost</title>
</svelte:head>
{#if $instance}
  {#if $instance.maintenance}
    <div class="text-warning">
      This instance is in Maintenance Mode and will not respond to requests.
    </div>
  {/if}
  <div class="accordion" id="accordionExample">
    <Overview />
    <Ftp />
    <Code />
    <Secrets />
    <Logging />
    <Danger />
  </div>
{/if}
