<script lang="ts">
  import Card from '$components/cards/Card.svelte'
  import CardHeader from '$components/cards/CardHeader.svelte'
  import { DOCS_URL } from '$src/env'
  import { client } from '$src/pocketbase-client'
  import { instance } from '../store'
  import ErrorMessage from './ErrorMessage.svelte'

  const { updateInstance } = client()

  $: ({ id, dev } = $instance)

  let errorMessage = ''

  const handleChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    const isChecked = target.checked

    // Update the database with the new value
    updateInstance({ id, fields: { dev: isChecked } })
      .then(() => 'saved')
      .catch((error) => {
        errorMessage = error.data.message || error.message
      })
  }
</script>

<Card>
  <CardHeader documentation={DOCS_URL(`/usage/dev-mode`)}>Dev Mode</CardHeader>

  <p class="mb-8">
    Starting with PocketBase v0.20.1, your instance will show debugging output
    in the instance logs. Performance is degraded while Dev Mode is active.
  </p>

  <ErrorMessage message={errorMessage} />

  <label class="label cursor-pointer justify-center gap-4">
    <span class="label-text">Dev Mode</span>
    <input
      type="checkbox"
      class="toggle toggle-warning"
      checked={!!dev}
      on:change={handleChange}
    />
  </label>
</Card>
