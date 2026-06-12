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

<div class="w-full flex items-center justify-center px-4 md:px-16 h-[70vh]">
  <wa-card class="w-[100%] lg:w-4/12 bg-[#111111]/80 border border-white/10 shadow-md overflow-hidden">
    <div class="p-6">
      {#if userShouldCheckTheirEmail}
        <div class="text-center">
          <h2 class="mb-4">Check Your Email</h2>
          <p>
            A verification link has been sent to <br /><strong>{email}</strong>
          </p>

          <div class="display-1">
            <i class="bi bi-envelope-check"></i>
          </div>
        </div>
      {:else}
        <h2 class="text-xl font-bold mb-4">Password Reset</h2>

        <form onsubmit={handleSubmit}>
          <div class="w-full mb-4">
            <label class="block mb-1" for="email">Email address</label>
            <wa-input
              type="email"
              id="email"
              placeholder="name@example.com"
              value={email}
              oninput={(e) => (email = e.currentTarget.value)}
              required
              autocomplete="email"
              class="w-full"
            ></wa-input>
          </div>

          <AlertBar message={formError} type="error" />

          <div class="mt-6 flex justify-end">
            <wa-button type="submit" variant="brand" class="w-full" disabled={isFormButtonDisabled}>
              Reset Password
              <wa-icon slot="end" name="arrow-right"></wa-icon>
            </wa-button>
          </div>
        </form>
      {/if}
    </div>
  </wa-card>
</div>
