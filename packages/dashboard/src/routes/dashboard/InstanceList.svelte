<script lang="ts">
  import Card from '$components/cards/Card.svelte'
  import CardHeader from '$components/cards/CardHeader.svelte'
  import InstanceRow from '$src/routes/dashboard/InstanceRow.svelte'
  import { globalInstancesStore } from '$util/stores'
  import { values } from '@s-libs/micro-dash'
  import { InstanceFields } from 'pockethost/common'

  let arrayOfActiveInstances: InstanceFields[] = []
  let arrayOfMaintenanceInstances: InstanceFields[] = []

  $: {
    if ($globalInstancesStore) {
      arrayOfActiveInstances = values($globalInstancesStore).filter(
        (app) => !app.maintenance,
      )
      arrayOfMaintenanceInstances = values($globalInstancesStore).filter(
        (app) => app.maintenance,
      )
    }
  }
</script>

<Card height="h-auto">
  <CardHeader>Active Instances</CardHeader>

  <div class="grid mb-24">
    {#each arrayOfActiveInstances as instance, index}
      <InstanceRow {instance} {index} />
    {/each}

    {#if arrayOfActiveInstances.length === 0}
      <p class="italic">
        None of your instances are active. Create a new app to use PocketBase!
      </p>
    {/if}
  </div>

  <CardHeader>Instances in Maintenance Mode</CardHeader>

  <p class="mb-4 opacity-50">
    Maintenance Mode will prevent these instances process from running. No
    requests are processed while your instance is in Maintenance Mode.
  </p>

  <div class="grid">
    {#each arrayOfMaintenanceInstances as instance, index}
      <InstanceRow {instance} {index} />
    {/each}

    {#if arrayOfMaintenanceInstances.length === 0}
      <p class="italic">None of your instances in Maintenance Mode</p>
    {/if}
  </div>
</Card>
