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
  <div class="card w-96 bg-zinc-900 mx-auto shadow-xl overflow-hidden">
    <div class="card-body text-center">
      <h2 class="mb-4">Confirming Your Account</h2>

      {#if formError}
        <div transition:slide class="alert alert-error mb-5">
          <i class="fa-solid fa-circle-exclamation"></i>
          <span>{formError}</span>
        </div>
      {:else}
        <div class="spinner-border mx-auto" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      {/if}
    </div>
  </div>
</div>
