<script lang="ts">
  import { assertExists } from 'pockethost'
  import { instance } from '../store'
  import AdminSync from './AdminSync.svelte'
  import CustomDomain from './CustomDomain.svelte'
  import DangerZoneTitle from './DangerZoneTitle.svelte'
  import DeleteInstance from './DeleteInstance.svelte'
  import DevMode from './DevMode.svelte'
  import Maintenance from './Maintenance.svelte'
  import RenameInstance from './RenameInstance.svelte'
  import VersionChange from './VersionChange/VersionChange.svelte'

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

  <Maintenance />

  <VersionChange />

  <AdminSync />

  <DevMode />

  <DeleteInstance />
</div>
<CustomDomain />
