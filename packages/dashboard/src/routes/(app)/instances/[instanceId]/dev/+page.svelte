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

<div class="max-w-2xl">
  <CardHeader documentation={`/docs/dev-mode`}>Dev Mode</CardHeader>

  <p class="mb-8">
    Starting with PocketBase v0.20.1, your instance will show debugging output in the instance logs. Performance is
    degraded while Dev Mode is active.
  </p>

  <ErrorMessage message={errorMessage} />

  <Toggle onChange={handleChange} checked={!!dev} onClass="warning" />
</div>
