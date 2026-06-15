<script lang="ts">
  import { goto } from '$app/navigation'
  import CardHeader from '$components/cards/CardHeader.svelte'
  import { client } from '$src/pocketbase-client'
  import { globalInstancesStore } from '$util/stores'
  import { instance } from '../store'
  import ErrorMessage from '../settings/ErrorMessage.svelte'
  import PowerOffRequired from '../PowerOffRequired.svelte'
  import { isInstanceFullyOff } from '$util/instancePower'

  $: ({ id, subdomain } = $instance)
  $: isFullyOff = isInstanceFullyOff($instance)

  let isButtonDisabled = false
  let errorMessage = ''

  const deletedPaths = ['pb_data/*', 'pb_public/*', 'pb_migrations/*', 'pb_static/*']

  const handleSave = async (e: Event) => {
    e.preventDefault()

    if (!isFullyOff) return

    isButtonDisabled = true

    const confirmed = confirm(
      `LAST CHANCE - Are you sure you want to delete this instance? Your database, all local files, logs, and subdomain will be lost.`
    )

    if (confirmed) {
      errorMessage = ''
      client()
        .deleteInstance({ id })
        .then(() => {
          globalInstancesStore.update((instances) => {
            const newInstances = { ...instances }
            delete newInstances[id]
            return newInstances
          })
          goto('/dashboard')
        })
        .catch((error) => {
          console.error(error)
          errorMessage = error.data.message || error.message
        })
    }

    isButtonDisabled = false
  }
</script>

<CardHeader documentation={`/docs/delete`}>Delete Instance</CardHeader>

<div class="mb-6">
  <PowerOffRequired poweredOffMessage="Instance must be powered off before deleting." />
</div>

<p class="text-white/70 text-sm mb-6 leading-relaxed">
  Deleting your instance is immediate and permanent. Everything below will be removed from PocketHost.
</p>

<wa-card class="border border-error/25 bg-[#111111]/80 shadow-lg overflow-hidden">
  <div class="wa-card-body wa-card-body--lg wa-stack-lg">
    <div>
      <p class="text-xs font-medium uppercase tracking-wide text-white/50 mb-3">What will be deleted</p>
      <ul class="space-y-2">
        <li class="rounded-lg bg-white/5 border border-white/5 px-4 py-3 text-sm text-white">
          <span class="text-white/50">Subdomain</span>
          <span class="mx-2 text-white/30">·</span>
          <span class="font-medium">{subdomain}</span>
        </li>
        {#each deletedPaths as path}
          <li class="rounded-lg bg-error/5 border border-error/10 px-4 py-3">
            <code class="font-mono text-sm text-error/90">{path}</code>
          </li>
        {/each}
      </ul>
    </div>

    <p class="text-sm text-white/50 leading-relaxed">
      If you are storing files on S3, you must delete them separately.
    </p>

    <ErrorMessage message={errorMessage} />

    <div class="pt-2 border-t border-white/10">
      <form onsubmit={handleSave}>
        <wa-button type="submit" variant="danger" disabled={!isFullyOff || isButtonDisabled}>
          <wa-icon slot="start" name="trash"></wa-icon>
          Delete Instance
        </wa-button>
      </form>
    </div>
  </div>
</wa-card>
