<script lang="ts">
  import { assertExists } from 'pockethost/common'
  import { instance } from '../store'
  import AdminSync from '../admin-sync/+page.svelte'
  import CustomDomain from '../domain/+page.svelte'
  import DangerZoneTitle from './DangerZoneTitle.svelte'
  import DeleteInstance from '../delete/+page.svelte'
  import DevMode from '../dev/+page.svelte'
  import RenameInstance from '../rename/+page.svelte'
  import VersionChange from '../version/+page.svelte'

  $: ({ status, version, id } = $instance)

  assertExists($instance, `Expected instance here`)
  const { subdomain } = $instance
</script>

<svelte:head>
  <title>{subdomain} overview - PocketHost</title>
</svelte:head>

<DangerZoneTitle />

<div class="grid lg:grid-cols-3 gap-4 mb-4">
  <RenameInstance />

  <VersionChange />

  <AdminSync />

  <DevMode />

  <DeleteInstance />
</div>
<CustomDomain />
