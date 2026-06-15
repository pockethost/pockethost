<script lang="ts">
  import { page } from '$app/stores'
  import { client } from '$src/pocketbase-client'
  import { onMount } from 'svelte'
  import { slide } from 'svelte/transition'

  const { confirmVerification } = client()

  let formError: string = ''
  const { token } = $page.params

  onMount(() => {
    if (!token) {
      formError = 'Invalid link'
    } else {
      try {
        confirmVerification(token).then(() => {
          window.location.href = '/dashboard'
        })
      } catch (error) {
        const e = error as Error
        formError = `Something went wrong with confirming your account. ${e.message}`
      }
    }
  })
</script>

<svelte:head>
  <title>Confirming Your Account - PocketHost</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center">
  <wa-card class="w-96 bg-zinc-900 mx-auto shadow-xl overflow-hidden">
    <div class="wa-card-body text-center">
      <h2 class="mb-4">Confirming Your Account</h2>

      {#if formError}
        <div in:slide>
          <wa-callout variant="danger" class="mb-5">
            <wa-icon slot="icon" name="circle-exclamation"></wa-icon>
            <span>{formError}</span>
          </wa-callout>
        </div>
      {:else}
        <div
          class="inline-block w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"
          role="status"
        >
          <span class="sr-only">Loading...</span>
        </div>
      {/if}
    </div>
  </wa-card>
</div>
