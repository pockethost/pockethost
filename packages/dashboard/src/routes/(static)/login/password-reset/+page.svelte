<script lang="ts">
  import { client } from '$src/pocketbase-client'
  import AlertBar from '$components/AlertBar.svelte'
  import BlurBg from '$components/BlurBg.svelte'

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

<BlurBg />
<div class=" w-full flex items-center justify-center px-4 md:px-16 h-[70vh]">
  <div class="card w-[100%]  lg:w-4/12 bg-[#111111]/80 border border-white/10 shadow-md overflow-hidden">
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
          <div class="form-control w-full ">
            <label class="label" for="email">Email address</label>
            <input
              type="email"
              class="input input-bordered w-full"
              id="email"
              placeholder="name@example.com"
              bind:value={email}
              required
              autocomplete="email"
            />
          </div>

          <AlertBar message={formError} type="error" />

          <div class="mt-6 card-actions justify-end">
            <button type="submit" class="btn bg-primary hover:bg-light w-full" disabled={isFormButtonDisabled}>
              Reset Password <i class="bi bi-arrow-right-short" />
            </button>
          </div>
        </form>
      {/if}
    </div>
  </div>
</div>
