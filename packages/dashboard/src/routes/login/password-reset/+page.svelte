<script lang="ts">
  import { handleUnauthenticatedPasswordReset } from '$util/database'
  import AlertBar from '$components/AlertBar.svelte'

  let email: string = ''
  let formError: string = ''

  let isFormButtonDisabled: boolean = true
  $: isFormButtonDisabled = email.length === 0

  let userShouldCheckTheirEmail = false

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault()

    isFormButtonDisabled = true

    await handleUnauthenticatedPasswordReset(email, (error) => {
      formError = error
    })

    isFormButtonDisabled = false
    userShouldCheckTheirEmail = true
  }
</script>

<svelte:head>
  <title>Password Reset - PocketHost</title>
</svelte:head>

<div class="page-bg">
  <div class="card">
    {#if userShouldCheckTheirEmail}
      <div class="text-center">
        <h2 class="mb-4">Check Your Email</h2>
        <p>A verification link has been sent to <br /><strong>{email}</strong></p>

        <div class="display-1">
          <i class="bi bi-envelope-check" />
        </div>
      </div>
    {:else}
      <h2 class="mb-4">Password Reset</h2>

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

        {#if formError}
          <AlertBar icon="bi bi-exclamation-triangle-fill" text={formError} />
        {/if}

        <button type="submit" class="btn btn-primary w-100" disabled={isFormButtonDisabled}>
          Send Verification Email <i class="bi bi-arrow-right-short" />
        </button>
      </form>
    {/if}

    <div class="py-4"><hr /></div>

    <div class="text-center">
      Need to <a href="/signup">create an account</a>?
    </div>
  </div>
</div>

<style lang="scss">
  .page-bg {
    background-color: #222;
    background-image: var(--gradient-light-soft-blue-vertical);
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
