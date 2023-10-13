<script lang="ts">
  import { page } from '$app/stores'
  import { slide } from 'svelte/transition'
  import { handleUnauthenticatedPasswordResetConfirm } from '$util/database'

  let password: string = ''
  let token: string | null = ''
  let formError: string = ''

  // Check for a token in the URL
  $: token = $page?.url?.searchParams?.get('token')

  let isFormButtonDisabled: boolean = true
  $: isFormButtonDisabled = password.length === 0

  const handleSubmit = async (e: Event) => {
    e.preventDefault()

    isFormButtonDisabled = true
    if (!token) return

    await handleUnauthenticatedPasswordResetConfirm(
      token,
      password,
      (error) => {
        formError = error
      },
    )

    // Hard refresh and send the user back to the login screen
    window.location = '/?view=login'

    isFormButtonDisabled = false
  }
</script>

<svelte:head>
  <title>Reset Your Password - PocketHost</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center">
  <div class="card w-96 bg-zinc-900 mx-auto shadow-xl overflow-hidden">
    <div class="card-body">
      <h2 class="card-title mb-4">New Password</h2>

      <form on:submit={handleSubmit}>
        <div class="form-control w-full max-w-xs">
          <label class="label" for="password">New Password</label>
          <input
            type="password"
            class="input input-bordered w-full max-w-xs"
            id="password"
            bind:value={password}
            required
            autocomplete="new-password"
          />
        </div>

        {#if formError}
          <div transition:slide class="alert alert-error mb-5">
            <i class="fa-solid fa-circle-exclamation"></i>
            <span>{formError}</span>
          </div>
        {/if}

        <div class="mt-4 card-actions justify-end">
          <button
            type="submit"
            class="btn btn-primary w-100"
            disabled={isFormButtonDisabled}
          >
            Save <i class="bi bi-arrow-right-short" />
          </button>
        </div>
      </form>
    </div>
  </div>
</div>
