<script lang="ts">
  import CardHeader from '$components/cards/CardHeader.svelte'
  import { client } from '$src/pocketbase-client'
  import { instance } from '../store'
  import ErrorMessage from '../settings/ErrorMessage.svelte'
  import Toggle from '../Toggle.svelte'
  import PowerOffRequired from '../PowerOffRequired.svelte'
  import { isInstanceFullyOff, isInstanceShuttingDown } from '$util/instancePower'

  const { updateInstance } = client()

  $: ({ id, autoVacuum } = $instance)
  $: isFullyOff = isInstanceFullyOff($instance)
  $: isShuttingDown = isInstanceShuttingDown($instance)

  let errorMessage = ''

  const handleChange = (isChecked: boolean) => {
    if (!isFullyOff) return

    updateInstance({ id, fields: { autoVacuum: isChecked } })
      .then(() => 'saved')
      .catch((error) => {
        errorMessage = error.data.message || error.message
      })
  }
</script>

<CardHeader documentation={`/docs/auto-vacuum`}>Auto Vacuum</CardHeader>

<p class="text-white/70 text-sm mb-6 leading-relaxed">
  Auto Vacuum reclaims disk space from your instance SQLite databases during PocketHost's nightly maintenance sweep.
  PocketHost only runs compaction when your instance is idle (hibernated), not while it is actively serving traffic. If
  a request wakes your instance during vacuum, you may see up to about 5 seconds of downtime while the database finishes
  compacting.
</p>

<PowerOffRequired action="change Auto Vacuum" />

<ErrorMessage message={errorMessage} />

<wa-card class="border border-white/10 bg-[#111111]/80 shadow-lg overflow-hidden">
  <div class="wa-card-body wa-card-body--lg">
    <Toggle checked={autoVacuum ?? true} onChange={handleChange} disabled={!isFullyOff} loading={isShuttingDown} />
  </div>
</wa-card>
