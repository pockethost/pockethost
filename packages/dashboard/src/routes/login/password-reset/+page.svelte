<script lang="ts">
  import AlertBar from '$components/AlertBar.svelte'
  import { handleUnauthenticatedPasswordReset } from '$util/database'

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

<div class="flex justify-center">
  <div class="card w-96 bg-base-100 shadow-xl">
    <div class="card-body">
      {#if userShouldCheckTheirEmail}
        <div class="text-center">
          <h2 class="mb-4">Check Your Email</h2>
          <p>
            A verification link has been sent to <br /><strong>{email}</strong>
          </p>

          <div class="display-1">
            <i class="bi bi-envelope-check" />
          </div>
        </div>
      {:else}
        <h2 class="card-title mb-4">Password Reset</h2>

        <form on:submit={handleSubmit}>
          <div class="form-control w-full max-w-xs">
            <label class="label" for="email">Email address</label>
            <input
              type="email"
              class="input input-bordered w-full max-w-xs"
              id="email"
              placeholder="name@example.com"
              bind:value={email}
              required
              autocomplete="email"
            />
          </div>

          {#if formError}
            <AlertBar icon="bi bi-exclamation-triangle-fill" text={formError} />
          {/if}

          <div class="mt-4 card-actions justify-end">
            <button
              type="submit"
              class="btn btn-primary w-100"
              disabled={isFormButtonDisabled}
            >
              Send Verification Email <i class="bi bi-arrow-right-short" />
            </button>
          </div>
        </form>
      {/if}
    </div>
  </div>
</div>
