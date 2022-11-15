<script lang="ts">
  import { PUBLIC_PB_PROTOCOL } from '$env/static/public'
  import { PUBLIC_PB_DOMAIN } from '$src/env'
  import { instance } from '../store'
  import Backup from './Backup.svelte'
  import Code from './Code.svelte'
  import Overview from './Overview.svelte'
  import Restore from './Restore.svelte'

  const { subdomain, status, platform, version } = $instance
  const url = `${PUBLIC_PB_PROTOCOL}://${subdomain}.${PUBLIC_PB_DOMAIN}`
  const code = `const url = '${url}'\nconst client = new PocketBase(url)`
</script>

<svelte:head>
  <title>{subdomain} details - PocketHost</title>
</svelte:head>

<Overview />
<Code />
<Backup />
<Restore />
