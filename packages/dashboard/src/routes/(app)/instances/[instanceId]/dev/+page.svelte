<script lang="ts">
  import CardHeader from '$components/cards/CardHeader.svelte'
  import { client } from '$src/pocketbase-client'
  import { instance } from '../store'
  import ErrorMessage from '../settings/ErrorMessage.svelte'
  import Toggle from '../Toggle.svelte'

  const { updateInstance } = client()

  $: ({ id, dev } = $instance)

  let errorMessage = ''

  const handleChange = (isChecked: boolean) => {
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

<ErrorMessage message={errorMessage} />

<wa-card class="border border-white/10 bg-[#111111]/80 shadow-lg overflow-hidden">
  <div class="p-6 md:p-8">
    <Toggle onChange={handleChange} checked={!!dev} onClass="warning" />
  </div>
</wa-card>
