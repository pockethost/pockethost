<script lang="ts">
  import { page } from '$app/stores'
  import { client } from '$src/pocketbase-client'
  import AlertBar from '$components/AlertBar.svelte'
  import BlurBg from '$components/BlurBg.svelte'

  const { requestPasswordResetConfirm } = client()

  let password: string = ''
  let formErrors: string[] = []

  // Check for a token in the URL
  $: ({ token } = $page.params)

  let isFormButtonDisabled: boolean = true
  $: isFormButtonDisabled = password.length === 0

  const handleSubmit = async (e: Event) => {
    e.preventDefault()

    // Clear out the error message
    formErrors = []

    // Check for the token and block the request if it doesn't exist
    if (!token) {
      formErrors = ['No token was found. Please check your email again for the link.']
      return
    }

    // Lock the button to prevent multiple submissions
    isFormButtonDisabled = true

    try {
      await requestPasswordResetConfirm(token, password)

      window.location.href = '/login'
    } catch (error) {
      if (error instanceof Error) {
        formErrors = client().parseError(error)
      } else {
        formErrors = ['Something went wrong with confirming your password change.']
      }
    }

    isFormButtonDisabled = false
  }
</script>

<svelte:head>
  <title>Reset Your Password - PocketHost</title>
</svelte:head>
<BlurBg />

<div class="w-full flex items-center justify-center px-4 md:px-16 h-[70vh]">
  <div class="card w-[100%]  lg:w-4/12 bg-[#111111]/80 border border-white/10 shadow-md overflow-hidden">
    <div class="card-body">
      <h2 class="card-title mb-4">New Password</h2>

      <form on:submit={handleSubmit}>
        <div class="form-control w-full">
          <label class="label" for="password">New Password</label>
          <input
            type="password"
            class="input input-bordered w-full"
            id="password"
            bind:value={password}
            required
            autocomplete="new-password"
          />
        </div>

        {#each formErrors as error}
          <AlertBar message={error} type="error" />
        {/each}

        <div class="mt-4 card-actions justify-end">
          <button type="submit" class="btn bg-primary hover:bg-light w-full" disabled={isFormButtonDisabled}>
            Save <i class="bi bi-arrow-right-short" />
          </button>
        </div>
      </form>
    </div>
  </div>
</div>
