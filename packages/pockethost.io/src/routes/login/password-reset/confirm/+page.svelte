<script lang="ts">
  import { page } from '$app/stores'
  import AlertBar from '$components/AlertBar.svelte'
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

    await handleUnauthenticatedPasswordResetConfirm(token, password, (error) => {
      formError = error
    })

    isFormButtonDisabled = false
  }
</script>

<svelte:head>
  <title>Reset Your Password - PocketHost</title>
</svelte:head>

<div class="page-bg">
  <div class="card">
    <h2 class="mb-4">New Password</h2>

    <form on:submit={handleSubmit}>
      <div class="form-floating mb-3">
        <input
          type="password"
          class="form-control"
          id="password"
          placeholder="Password"
          bind:value={password}
          required
          autocomplete="password"
        />
        <label for="password">New Password</label>
      </div>

      {#if formError}
        <AlertBar icon="bi bi-exclamation-triangle-fill" text={formError} />
      {/if}

      <button type="submit" class="btn btn-primary w-100" disabled={isFormButtonDisabled}>
        Save <i class="bi bi-arrow-right-short" />
      </button>
    </form>
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
