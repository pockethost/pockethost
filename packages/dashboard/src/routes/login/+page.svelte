<script lang="ts">
  import AlertBar from '$components/AlertBar.svelte'
  import { handleLogin } from '$util/database'

  let email: string = ''
  let password: string = ''
  let formError: string = ''

  let isFormButtonDisabled: boolean = true
  $: isFormButtonDisabled = email.length === 0 || password.length === 0

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault()

    isFormButtonDisabled = true

    await handleLogin(email, password, (error) => {
      formError = error
    })

    isFormButtonDisabled = false
  }
</script>

<svelte:head>
  <title>Sign In - PocketHost</title>
</svelte:head>

<div class="flex justify-center">
  <div class="card w-96 bg-base-100 shadow-xl">
    <div class="card-body">
      <h2 class="card-title mb-4">Login</h2>

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

        <div class="form-control w-full max-w-xs">
          <label class="label" for="password">Password</label>
          <input
            type="password"
            class="input input-bordered w-full max-w-xs"
            id="password"
            placeholder="Password"
            bind:value={password}
            required
            autocomplete="current-password"
          />
        </div>

        <p class="m-3"></p>

        {#if formError}
          <AlertBar icon="bi bi-exclamation-triangle-fill" text={formError} />
        {/if}

        <button
          type="submit"
          class="btn btn-primary w-100"
          disabled={isFormButtonDisabled}
        >
          Log In <i class="bi bi-arrow-right-short" />
        </button>
      </form>

      <div class="py-4"><hr /></div>

      <div class="text-center">
        <a class="link" href="/signup">sign up</a> |
        <a class="link" href="/login/password-reset">forgot password</a>
      </div>
    </div>
  </div>
</div>
