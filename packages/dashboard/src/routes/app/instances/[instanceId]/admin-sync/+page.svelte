<script lang="ts">
  import Card from '$components/cards/Card.svelte'
  import CardHeader from '$components/cards/CardHeader.svelte'
  import { DOCS_URL } from '$src/env'
  import { client } from '$src/pocketbase-client'
  import { instance } from '../store'
  import ErrorMessage from '../settings/ErrorMessage.svelte'
  import Toggle from '../Toggle.svelte'

  const { updateInstance } = client()

  $: ({ id, syncAdmin } = $instance)

  let errorMessage = ''

  const handleChange = (isChecked: boolean) => {
    // Update the database with the new value
    updateInstance({ id, fields: { syncAdmin: isChecked } })
      .then(() => 'saved')
      .catch((error) => {
        errorMessage = error.data.message || error.message
      })
  }
</script>

<CardHeader documentation={DOCS_URL(`/usage/admin-sync`)}>
  Admin Sync
</CardHeader>

<p class="mb-8">
  Your instance will have an admin login that matches your pockethost.io login.
</p>

<ErrorMessage message={errorMessage} />

<Toggle checked={!!syncAdmin} onChange={handleChange} />
