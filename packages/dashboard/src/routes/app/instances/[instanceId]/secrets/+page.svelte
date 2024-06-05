<script lang="ts">
  import { assertExists } from '$shared'
  import { instance } from '../store'
  import SecretsInner from './SecretsInner.svelte'

  $: ({ status, version, id } = $instance)

  assertExists($instance, `Expected instance here`)
  const { subdomain } = $instance
</script>

<svelte:head>
  <title>{subdomain} secrets - PocketHost</title>
</svelte:head>

<SecretsInner />
