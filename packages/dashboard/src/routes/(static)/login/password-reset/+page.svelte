<script lang="ts">
  import { client } from '$src/pocketbase-client'
  import AlertBar from '$components/AlertBar.svelte'

  const { requestPasswordReset } = client()

  let email: string = ''
  let formError: string = ''

  let isFormButtonDisabled: boolean = true
  $: isFormButtonDisabled = email.length === 0

  let userShouldCheckTheirEmail = false

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault()

    isFormButtonDisabled = true

    try {
      await requestPasswordReset(email)
    } catch (error) {
      const e = error as Error
      formError = `Something went wrong with resetting you password. ${e.message}`
    }

    isFormButtonDisabled = false
    userShouldCheckTheirEmail = true
  }
</script>

<svelte:head>
  <title>Password Reset - PocketHost</title>
</svelte:head>

<div class="w-full flex items-center justify-center px-4 md:px-16 py-10 md:py-16">
  <div class="auth-card w-full max-w-md">
    {#if userShouldCheckTheirEmail}
      <div class="auth-form text-center">
        <h2 class="auth-form-title">Check Your Email</h2>
        <p class="text-white/80">
          A verification link has been sent to <br /><strong class="text-white">{email}</strong>
        </p>
      </div>
    {:else}
      <form class="auth-form" onsubmit={handleSubmit}>
        <h2 class="auth-form-title">Password Reset</h2>

        <div class="auth-field-group">
          <label class="auth-label" for="email">Email address</label>
          <wa-input
            type="email"
            id="email"
            placeholder="name@example.com"
            value={email}
            oninput={(e: Event) => (email = (e.currentTarget as HTMLInputElement).value)}
            required
            autocomplete="email"
            class="w-full"
          ></wa-input>
        </div>

        <AlertBar message={formError} type="error" />

        <button type="submit" class="auth-submit" disabled={isFormButtonDisabled}>
          Reset Password
          <wa-icon name="arrow-right"></wa-icon>
        </button>
      </form>
    {/if}
  </div>
</div>
