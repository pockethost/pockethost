<script lang="ts">
  import Card from '$components/cards/Card.svelte'
  import CardHeader from '$components/cards/CardHeader.svelte'
  import { client } from '$src/pocketbase-client'
  import { handleCreateNewInstance } from '$util/database'
  import { writable } from 'svelte/store'
  import { slide } from 'svelte/transition'

  const instanceNameField = writable('')
  const instanceInfo = writable({
    name: '',
    fetching: true,
    available: false,
  })

  const generateSlug = async () => {
    instanceInfo.update((info) => ({ ...info, fetching: true }))
    const { instanceName: name } = await client().client.send(`/api/signup`, {})
    instanceInfo.update((info) => ({
      ...info,
      available: true,
      name,
      fetching: false,
    }))
    instanceNameField.set(name)
  }

  instanceNameField.subscribe(async (name) => {
    if (name !== $instanceInfo.name) {
      try {
        instanceInfo.update((info) => ({
          ...info,
          fetching: true,
        }))

        await client().client.send(`/api/signup?name=${encodeURIComponent(name)}`, {})

        instanceInfo.update((info) => ({
          ...info,
          fetching: false,
          available: true,
          name,
        }))
      } catch (e) {
        instanceInfo.update((info) => ({
          ...info,
          fetching: false,
          available: false,
          name,
        }))
      }
    }
  })

  generateSlug()

  let formError: string = ''
  let isSubmitting = false

  let isFormButtonDisabled: boolean = true
  $: isFormButtonDisabled = $instanceInfo.name.length === 0 || !$instanceInfo.available

  const handleInstanceNameRegeneration = () => {
    generateSlug()
  }

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault()

    isSubmitting = true
    formError = ''

    await handleCreateNewInstance($instanceNameField, (error) => {
      formError = error
    }).finally(async () => {
      isSubmitting = false
    })
  }
</script>

<Card>
  <form onsubmit={handleSubmit}>
    <CardHeader>Choose a name for your PocketBase instance.</CardHeader>

    <div class="flex rename-instance-form-container-query gap-2">
      <wa-input
        type="text"
        value={$instanceNameField}
        oninput={(e) => instanceNameField.set(e.currentTarget.value)}
        class="w-full"
      ></wa-input>

      <wa-button
        type="button"
        variant="neutral"
        appearance="outline"
        aria-label="Regenerate Instance Name"
        onclick={handleInstanceNameRegeneration}
      >
        <wa-icon name="rotate"></wa-icon>
      </wa-button>
    </div>

    <div style="font-size: 15px;" class="p-2 mb-4">
      {#if $instanceInfo.fetching}
        Verifying...
      {:else if $instanceInfo.available}
        <span class="text-success"> https://{$instanceInfo.name}.pockethost.io ✔︎</span>
      {:else}
        <span class="text-error"> https://{$instanceInfo.name}.pockethost.io ❌</span>
      {/if}
    </div>

    {#if formError}
      <wa-callout variant="danger" class="mb-5">
        <wa-icon slot="icon" name="circle-exclamation"></wa-icon>
        <span>{formError}</span>
      </wa-callout>
    {/if}

    <div class="flex items-center justify-center gap-4">
      <wa-button href="/dashboard" variant="neutral" class="flex-1">Cancel</wa-button>

      <wa-button type="submit" variant="brand" class="flex-1" disabled={isFormButtonDisabled}>
        {#if isSubmitting}
          <span class="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
        {:else}
          Create
          <wa-icon slot="end" name="arrow-right"></wa-icon>
        {/if}
      </wa-button>
    </div>
  </form>
</Card>

<style>
  .rename-instance-form-container-query {
    flex-direction: column;
  }

  @container (min-width: 400px) {
    .rename-instance-form-container-query {
      flex-direction: row;
    }
  }
</style>
