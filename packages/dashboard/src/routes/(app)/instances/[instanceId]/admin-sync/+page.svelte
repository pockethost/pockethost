<script lang="ts">
  import FeatureTab from '$components/FeatureTab.svelte'
  import { client } from '$src/pocketbase-client'
  import { instance } from '../store'
  import Toggle from '../Toggle.svelte'
  import { isInstanceFullyOff, isInstanceShuttingDown } from '$util/instancePower'

  const { updateInstance } = client()

  $: ({ id, syncAdmin } = $instance)
  $: isFullyOff = isInstanceFullyOff($instance)
  $: isShuttingDown = isInstanceShuttingDown($instance)

  let errorMessage = ''

  const handleChange = (isChecked: boolean) => {
    if (!isFullyOff) return

    updateInstance({ id, fields: { syncAdmin: isChecked } })
      .then(() => 'saved')
      .catch((error) => {
        errorMessage = error.data.message || error.message
      })
  }
</script>

<FeatureTab title="Admin Sync" documentation="/docs/admin-sync" powerOffAction="change Admin Sync" {errorMessage}>
  <svelte:fragment slot="summary">
    <p>
      Admin Sync ensures that your instance always has an admin account that matches the login credentials of your
      pockethost.io account.
    </p>
  </svelte:fragment>

  <wa-card class="border border-white/10 bg-[#111111]/80 shadow-lg overflow-hidden">
    <div class="wa-card-body wa-card-body--lg">
      <Toggle checked={!!syncAdmin} onChange={handleChange} disabled={!isFullyOff} loading={isShuttingDown} />
    </div>
  </wa-card>
</FeatureTab>
