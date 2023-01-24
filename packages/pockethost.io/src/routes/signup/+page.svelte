<script lang="ts">
  import AlertBar from '$components/AlertBar.svelte'
  import { handleFormError, handleLogin, handleRegistration } from '$util/database'

  let email: string = ''
  let password: string = ''
  let formError: string = ''

  let isFormButtonDisabled: boolean = true
  $: isFormButtonDisabled = email.length === 0 || password.length === 0

  const handleSubmit = async (e: Event) => {
    e.preventDefault()

    isFormButtonDisabled = true

    try {
      await handleRegistration(email, password)

      // Go ahead and log the user into the site
      await handleLogin(email, password)
    } catch (error: any) {
      handleFormError(error, (error) => {
        formError = error
      })
    }

    isFormButtonDisabled = false
  }
</script>

<svelte:head>
  <title>Sign Up - PocketHost</title>
</svelte:head>

<div class="page-bg">
  <div class="card">
    <h2 class="mb-4">Sign Up</h2>

    <form on:submit={handleSubmit}>
      <div class="form-floating mb-3">
        <input
          type="email"
          class="form-control"
          id="email"
          placeholder="name@example.com"
          bind:value={email}
          required
          autocomplete="email"
        />
        <label for="email">Email address</label>
      </div>

      <div class="form-floating mb-3">
        <input
          type="password"
          class="form-control"
          id="password"
          placeholder="Password"
          bind:value={password}
          required
          autocomplete="new-password"
        />
        <label for="password">Password</label>
      </div>

      {#if formError}
        <AlertBar icon="bi bi-exclamation-triangle-fill" text={formError} />
      {/if}

      <button type="submit" class="btn btn-primary w-100" disabled={isFormButtonDisabled}>
        Sign Up <i class="bi bi-arrow-right-short" />
      </button>
    </form>

    <div class="py-4"><hr /></div>

    <div class="text-center">
      Already have an account? <a href="/login">Log in</a>
    </div>
  </div>
</div>

<style lang="scss">
  .page-bg {
    background-color: #222;
    background-image: var(--gradient-dark-soft-blue);
    display: flex;
    align-items: center;
    justify-content: center;
    height: calc(100vh - 91px);
    padding: 0 18px;
  }

  .card {
    border: 0;
    box-shadow: var(--soft-box-shadow);
    padding: 24px;
    max-width: 425px;
    width: 100%;
    border-radius: 24px;
  }

  @media screen and (min-width: 768px) {
    .card {
      padding: 48px;
    }
  }
</style>
