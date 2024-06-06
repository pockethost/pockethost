<script lang="ts">
  import Card from '$components/cards/Card.svelte'
  import CardHeader from '$components/cards/CardHeader.svelte'
  import { DOCS_URL } from '$src/env'
  import { client } from '$src/pocketbase-client'
  import { userStore } from '$util/stores'
  import { instance } from '../store'
  import ErrorMessage from './ErrorMessage.svelte'

  const { updateInstance } = client()

  let errorMessage = ''

  $: ({ id, maintenance, notifyMaintenanceMode } = $instance)

  const handleMaintenanceChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    const maintenance = target.checked

    // Update the database with the new value
    updateInstance({ id, fields: { maintenance } })
      .then(() => 'saved')
      .catch((error) => {
        error.data.message || error.message
      })
  }

  const handleNotifyMaintenanceChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    const notifyMaintenanceMode = target.checked

    // Update the database with the new value
    updateInstance({ id, fields: { notifyMaintenanceMode } })
      .then(() => 'saved')
      .catch((error) => {
        error.data.message || error.message
      })
  }
</script>

<Card>
  <CardHeader documentation={DOCS_URL(`/usage/maintenance`)}>
    Maintenance Mode
  </CardHeader>

  <p class="mb-8">
    Your PocketHost instance will not be accessible while in maintenance mode.
    Use this when you are upgrading, downgrading, or backing up your data.
  </p>

  <ErrorMessage message={errorMessage} />

  <label class="label cursor-pointer justify-center gap-4">
    <span class="label-text">Maintenance Mode</span>
    <input
      type="checkbox"
      class="toggle toggle-warning"
      checked={!!maintenance}
      on:change={handleMaintenanceChange}
    />
  </label>

  <label class="label cursor-pointer justify-center gap-4">
    <span class="label-text">Email on Maintenance Mode</span>
    <input
      type="checkbox"
      class="toggle toggle-success"
      checked={!!notifyMaintenanceMode}
      on:change={handleNotifyMaintenanceChange}
    />
  </label>
  {#if !$userStore?.notifyMaintenanceMode}
    <div class="text-error">
      Warning: Maintenance Mode is globally deactivated. This setting will have
      no effect. See account settings.
    </div>
  {/if}
</Card>
