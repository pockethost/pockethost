<script lang="ts">
  import Card from '$components/cards/Card.svelte'
  import CardHeader from '$components/cards/CardHeader.svelte'
  import { DOCS_URL } from '$src/env'
  import { client } from '$src/pocketbase-client'
  import { instance } from '../store'
  import ErrorMessage from './ErrorMessage.svelte'

  const { updateInstance } = client()

  let errorMessage = ''

  $: ({ id, maintenance } = $instance)

  const handleChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    const isChecked = target.checked

    // Update the database with the new value
    updateInstance({ id, fields: { maintenance: isChecked } })
      .then(() => 'saved')
      .catch((error) => {
        error.data.message || error.message
      })
  }
</script>

<Card>
  <CardHeader documentation={DOCS_URL(`/usage/maintenance`)}>
    Maintenance Mode
  </CardHeader>

  <p class="mb-8">
    Your PocketHost instance will not be accessible while in maintenance mode.
    Use this when you are upgrading, downgrading, or backing up your data.
  </p>

  <ErrorMessage message={errorMessage} />

  <label class="label cursor-pointer justify-center gap-4">
    <span class="label-text">Maintenance Mode</span>
    <input
      type="checkbox"
      class="toggle toggle-warning"
      checked={!!maintenance}
      on:change={handleChange}
    />
  </label>
</Card>
