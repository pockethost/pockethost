<script lang="ts">
  import { globalInstancesStore, userStore } from '$util/stores'
  import InstanceList from './InstanceList.svelte'

  $: instanceCount = Object.values($globalInstancesStore).length
  $: canCreate = ($userStore?.subscription_quantity ?? 0) > 0
</script>

<svelte:head>
  <title>Dashboard - PocketHost</title>
</svelte:head>

<header class="dashboard-head">
  <div>
    <h1 class="dashboard-title">Dashboard</h1>
    <p class="dashboard-subtitle">
      {#if instanceCount === 0}
        Create a PocketBase instance to get started.
      {:else}
        {instanceCount} instance{instanceCount === 1 ? '' : 's'}. Plans will be limited by storage, not instance count.
      {/if}
    </p>
  </div>

  {#if canCreate}
    <wa-button href="/instances/new" variant="brand" class="dashboard-new-btn">
      <wa-icon slot="start" name="plus"></wa-icon>
      New instance
    </wa-button>
  {/if}
</header>

<InstanceList />

<style>
  .dashboard-head {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.75rem;
  }

  .dashboard-title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: #fff;
  }

  @media (min-width: 768px) {
    .dashboard-title {
      font-size: 1.875rem;
    }
  }

  .dashboard-subtitle {
    margin: 0.35rem 0 0;
    max-width: 36rem;
    font-size: 0.875rem;
    line-height: 1.45;
    color: rgb(255 255 255 / 0.45);
  }

  .dashboard-new-btn {
    flex-shrink: 0;
  }
</style>
