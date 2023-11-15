<script lang="ts">
  import Card from '$components/cards/Card.svelte'
  import CardHeader from '$components/cards/CardHeader.svelte'
  import { DOCS_URL } from '$src/env'
  import { client } from '$src/pocketbase-client'
  import { instance } from '../store'

  const { updateInstance } = client()

  $: ({ id, syncAdmin } = $instance)

  const handleChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    const isChecked = target.checked

    // Update the database with the new value
    updateInstance({ id, fields: { syncAdmin: isChecked } }).then(() => 'saved')
  }
</script>

<Card>
  <CardHeader documentation={DOCS_URL(`/usage/admin-sync`)}>
    Admin Sync
  </CardHeader>

  <p class="mb-8">
    Your instance will have an admin login that matches your pockethost.io
    login.
  </p>

  <label class="label cursor-pointer justify-center gap-4">
    <span class="label-text">Admin Sync</span>
    <input
      type="checkbox"
      class="toggle toggle-warning"
      checked={!!syncAdmin}
      on:change={handleChange}
    />
  </label>
</Card>
