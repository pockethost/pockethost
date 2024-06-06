<script lang="ts">
  import { page } from '$app/stores'
  import { client } from '$src/pocketbase-client'
  import AlertBar from '$components/AlertBar.svelte'

  const { requestPasswordResetConfirm } = client()

  let password: string = ''
  let token: string | null = ''
  let formError: string = ''

  // Check for a token in the URL
  $: token = $page?.url?.searchParams?.get('token')

  let isFormButtonDisabled: boolean = true
  $: isFormButtonDisabled = password.length === 0

  const handleSubmit = async (e: Event) => {
    e.preventDefault()

    // Clear out the error message
    formError = ''

    // Check for the token and block the request if it doesn't exist
    if (!token) {
      formError =
        'No token was found. Please check your email again for the link.'
      return
    }

    // Lock the button to prevent multiple submissions
    isFormButtonDisabled = true

    try {
      await requestPasswordResetConfirm(token, password)

      // Hard refresh and send the user back to the login screen
      window.location.href = '/?view=login'
    } catch (error) {
      const e = error as Error
      formError = `Something went wrong with confirming your password change. ${e.message}`
    }

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

        <AlertBar message={formError} type="error" />

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
