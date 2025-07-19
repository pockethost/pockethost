<script lang="ts">
  import Card from '$components/cards/Card.svelte'
  import CardHeader from '$components/cards/CardHeader.svelte'
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

<CardHeader documentation={`/docs/admin-sync`}>Admin Sync</CardHeader>

<p class="mb-8">
  Admin Sync ensures that your instance always has an admin account that matches the login credentials of your
  pockethost.io account.
</p>

<ErrorMessage message={errorMessage} />

<Toggle checked={!!syncAdmin} onChange={handleChange} />
