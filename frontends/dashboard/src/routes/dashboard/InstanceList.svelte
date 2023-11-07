<script lang="ts">
  import Card from '$components/cards/Card.svelte'
  import CardHeader from '$components/cards/CardHeader.svelte'
  import { globalInstancesStore } from '$util/stores'
  import InstanceRow from '$src/routes/dashboard/InstanceRow.svelte'
  import { values } from '@s-libs/micro-dash'
  import { slide } from 'svelte/transition'

  let isMaintenanceModeOpen = false

  type TypeInstanceObject = {
    id: string
    subdomain: string
    status: string
    version: string
    maintenance: boolean
  }

  let arrayOfActiveInstances: TypeInstanceObject[] = []
  let arrayOfMaintenanceInstances: TypeInstanceObject[] = []

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
  </div>

  <CardHeader>Instances in Maintenance Mode</CardHeader>

  <div class="grid">
    {#each arrayOfMaintenanceInstances as instance, index}
      <InstanceRow {instance} {index} />
    {/each}
  </div>
</Card>
