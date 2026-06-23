<script lang="ts">
  import { page } from '$app/stores'
  import { client } from '$src/pocketbase-client'
  import AlertBar from '$components/AlertBar.svelte'

  const { confirmEmailChange } = client()

  let password: string = ''
  let formErrors: string[] = []
  let showPassword = false

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
      await confirmEmailChange(token, password)

      window.location.href = '/login?emailChanged=1'
    } catch (error) {
      if (error instanceof Error) {
        formErrors = client().parseError(error)
      } else {
        formErrors = ['Something went wrong confirming your email change.']
      }
    }

    isFormButtonDisabled = false
  }
</script>

<svelte:head>
  <title>Confirm Email Change - PocketHost</title>
</svelte:head>

<div class="w-full flex items-center justify-center px-4 md:px-16 py-10 md:py-16">
  <div class="auth-card w-full max-w-md">
    <form class="auth-form" method="post" autocomplete="on" onsubmit={handleSubmit}>
      <h2 class="auth-form-title">Confirm email change</h2>
      <p class="text-sm text-white/70 mb-4">Enter your current password to complete the change.</p>

      <div class="auth-field-group">
        <label class="auth-label" for="password">Current password</label>
        <div class="auth-field-wrap">
          <input
            type={showPassword ? 'text' : 'password'}
            id="password"
            name="password"
            class="auth-field auth-field--password"
            placeholder="Password"
            autocomplete="current-password"
            bind:value={password}
            required
          />
          {#if password.length > 0}
            <button
              type="button"
              class="auth-field-toggle"
              onclick={() => (showPassword = !showPassword)}
              tabindex="-1"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <wa-icon name={showPassword ? 'eye-slash' : 'eye'}></wa-icon>
            </button>
          {/if}
        </div>
      </div>

      {#each formErrors as error}
        <AlertBar message={error} type="error" />
      {/each}

      <button type="submit" class="auth-submit" disabled={isFormButtonDisabled}>
        Confirm
        <wa-icon name="arrow-right"></wa-icon>
      </button>
    </form>
  </div>
</div>
