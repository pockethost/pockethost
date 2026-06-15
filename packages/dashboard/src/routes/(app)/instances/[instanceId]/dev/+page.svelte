<script lang="ts">
  import CardHeader from '$components/cards/CardHeader.svelte'
  import { client } from '$src/pocketbase-client'
  import { instance } from '../store'
  import ErrorMessage from '../settings/ErrorMessage.svelte'
  import Toggle from '../Toggle.svelte'
  import PowerOffRequired from '../PowerOffRequired.svelte'
  import { isInstanceFullyOff, isInstanceShuttingDown } from '$util/instancePower'

  const { updateInstance } = client()

  $: ({ id, dev } = $instance)
  $: isFullyOff = isInstanceFullyOff($instance)
  $: isShuttingDown = isInstanceShuttingDown($instance)

  let errorMessage = ''

  const handleChange = (isChecked: boolean) => {
    if (!isFullyOff) return

    updateInstance({ id, fields: { dev: isChecked } })
      .then(() => 'saved')
      .catch((error) => {
        errorMessage = error.data.message || error.message
      })
  }
</script>

<CardHeader documentation={`/docs/dev-mode`}>Dev Mode</CardHeader>

<p class="text-white/70 text-sm mb-6 leading-relaxed">
  Starting with PocketBase v0.20.1, your instance will show debugging output in the instance logs. Performance is
  degraded while Dev Mode is active.
</p>

<PowerOffRequired action="change Dev Mode" />

<ErrorMessage message={errorMessage} />

<wa-card class="border border-white/10 bg-[#111111]/80 shadow-lg overflow-hidden">
  <div class="wa-card-body wa-card-body--lg">
    <Toggle onChange={handleChange} checked={!!dev} onClass="warning" disabled={!isFullyOff} loading={isShuttingDown} />
  </div>
</wa-card>
