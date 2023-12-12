<script lang="ts">
  import { assertExists } from '$shared'
  import Code from './Code.svelte'
  import Ftp from './Ftpx.svelte'
  import { instance } from './store'

  $: ({ status, version, id } = $instance)

  assertExists($instance, `Expected instance here`)
  const { subdomain } = $instance
</script>

<svelte:head>
  <title>{subdomain} overview - PocketHost</title>
</svelte:head>

<div class="grid lg:grid-cols-2 grid-cols-1 gap-4 mb-4">
  <Code />
  <Ftp />
</div>
