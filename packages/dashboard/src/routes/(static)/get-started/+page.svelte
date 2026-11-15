<script lang="ts">
  import { goto } from '$app/navigation'
  import { onMount } from 'svelte'

  // Pay first: new accounts start on /pricing. This path stays for old links.
  onMount(() => goto('/pricing', { replaceState: true }))
</script>

<svelte:head>
  <title>Get started - PocketHost</title>
</svelte:head>
