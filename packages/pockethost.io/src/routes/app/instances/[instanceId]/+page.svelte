<script lang="ts">
  import { PUBLIC_PB_PROTOCOL } from '$env/static/public'
  import { PUBLIC_PB_DOMAIN } from '$src/env'
  import { assertExists } from '@pockethost/common'
  import Backup from './Backup.svelte'
  import Code from './Code.svelte'
  import Overview from './Overview.svelte'
  import Restore from './Restore.svelte'
  import { instance } from './store'

  assertExists($instance, `Expected instance here`)
  const { subdomain } = $instance
  const url = `${PUBLIC_PB_PROTOCOL}://${subdomain}.${PUBLIC_PB_DOMAIN}`
  const code = `const url = '${url}'\nconst client = new PocketBase(url)`
</script>

<svelte:head>
  <title>{subdomain} details - PocketHost</title>
</svelte:head>
{#if $instance}
  <Overview instance={$instance} />
  <Code instance={$instance} />
  <Backup instance={$instance} />
  <Restore instance={$instance} />
{/if}
