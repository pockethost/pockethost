<script lang="ts">
  import { page } from '$app/stores'
  import { client } from '$src/pocketbase-client'
  import AlertBar from '$components/AlertBar.svelte'

  const { requestPasswordResetConfirm } = client()

  let password: string = ''
  let formErrors: string[] = []

  $: ({ token } = $page.params)

  let isFormButtonDisabled: boolean = true
  $: isFormButtonDisabled = password.length === 0

  const handleSubmit = async (e: Event) => {
    e.preventDefault()

    formErrors = []

    if (!token) {
      formErrors = ['No token was found. Please check your email again for the link.']
      return
    }

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

<div class="w-full flex items-center justify-center px-4 md:px-16 py-10 md:py-16">
  <div class="auth-card w-full max-w-md">
    <form class="auth-form" onsubmit={handleSubmit}>
      <h2 class="auth-form-title">New Password</h2>

      <div class="auth-field-group">
        <label class="auth-label" for="password">New Password</label>
        <wa-input
          type="password"
          id="password"
          value={password}
          oninput={(e: Event) => (password = (e.currentTarget as HTMLInputElement).value)}
          required
          autocomplete="new-password"
          class="w-full"
        ></wa-input>
      </div>

      {#each formErrors as error}
        <AlertBar message={error} type="error" />
      {/each}

      <button type="submit" class="auth-submit" disabled={isFormButtonDisabled}>
        Save
        <wa-icon name="arrow-right"></wa-icon>
      </button>
    </form>
  </div>
</div>
