<script lang="ts">
  import { assertExists } from 'pockethost/common'
  import { instance } from '../store'
  import SecretsInner from './Inner.svelte'
  import CardHeader from '$src/components/cards/CardHeader.svelte'

  $: ({ status, version, id } = $instance)

  assertExists($instance, `Expected instance here`)
  const { subdomain } = $instance
</script>

<svelte:head>
  <title>{subdomain} secrets - PocketHost</title>
</svelte:head>

<div class="max-w-2xl">
  <CardHeader>Secrets</CardHeader>
  <SecretsInner />
</div>
