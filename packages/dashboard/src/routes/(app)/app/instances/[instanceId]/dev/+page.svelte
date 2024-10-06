<script lang="ts">
  import Card from '$components/cards/Card.svelte'
  import CardHeader from '$components/cards/CardHeader.svelte'
  import { DOCS_URL } from '$src/env'
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

<CardHeader documentation={DOCS_URL(`/usage/dev-mode`)}>Dev Mode</CardHeader>

<p class="mb-8">
  Starting with PocketBase v0.20.1, your instance will show debugging output in
  the instance logs. Performance is degraded while Dev Mode is active.
</p>

<ErrorMessage message={errorMessage} />

<Toggle
  title="Dev Mode"
  onChange={handleChange}
  checked={!!dev}
  onClass="warning"
/>
