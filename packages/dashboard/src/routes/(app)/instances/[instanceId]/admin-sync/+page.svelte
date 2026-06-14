<script lang="ts">
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

<p class="text-white/70 text-sm mb-6 leading-relaxed">
  Admin Sync ensures that your instance always has an admin account that matches the login credentials of your
  pockethost.io account.
</p>

<ErrorMessage message={errorMessage} />

<wa-card class="border border-white/10 bg-[#111111]/80 shadow-lg overflow-hidden">
  <div class="p-6 md:p-8">
    <Toggle checked={!!syncAdmin} onChange={handleChange} />
  </div>
</wa-card>
