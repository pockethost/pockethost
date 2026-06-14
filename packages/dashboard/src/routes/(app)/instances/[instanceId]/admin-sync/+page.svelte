<script lang="ts">
  import CardHeader from '$components/cards/CardHeader.svelte'
  import { client } from '$src/pocketbase-client'
  import { instance } from '../store'
  import ErrorMessage from '../settings/ErrorMessage.svelte'
  import Toggle from '../Toggle.svelte'
  import PowerOffRequired from '../PowerOffRequired.svelte'
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

<CardHeader documentation={`/docs/admin-sync`}>Admin Sync</CardHeader>

<p class="text-white/70 text-sm mb-6 leading-relaxed">
  Admin Sync ensures that your instance always has an admin account that matches the login credentials of your
  pockethost.io account.
</p>

<PowerOffRequired action="change Admin Sync" />

<ErrorMessage message={errorMessage} />

<wa-card class="border border-white/10 bg-[#111111]/80 shadow-lg overflow-hidden">
  <div class="p-6 md:p-8">
    <Toggle checked={!!syncAdmin} onChange={handleChange} disabled={!isFullyOff} loading={isShuttingDown} />
  </div>
</wa-card>
