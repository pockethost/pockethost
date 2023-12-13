<script lang="ts">
  import AuthStateGuard from '$components/helpers/AuthStateGuard.svelte'
  import InstanceList from './InstanceList.svelte'
</script>

<svelte:head>
  <title>Dashboard - PocketHost</title>
</svelte:head>

<AuthStateGuard>
  <div class="flex items-center justify-between mb-6">
    <h2 class="text-4xl text-base-content font-bold capitalize">Dashboard</h2>

    <a href="/app/new" class="m-3 btn btn-primary"
      ><i class="fa-solid fa-plus"></i> New App</a
    >
  </div>

  <InstanceList />
</AuthStateGuard>
