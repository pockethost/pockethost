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

<div class="w-full flex items-center justify-center px-4 md:px-16 h-[70vh]">
  <wa-card class="w-[100%] lg:w-4/12 bg-[#111111]/80 border border-white/10 shadow-md overflow-hidden">
    <div class="p-6">
      <h2 class="text-xl font-bold mb-4">New Password</h2>

      <form onsubmit={handleSubmit}>
        <div class="w-full mb-4">
          <label class="block mb-1" for="password">New Password</label>
          <wa-input
            type="password"
            id="password"
            value={password}
            oninput={(e) => (password = e.currentTarget.value)}
            required
            autocomplete="new-password"
            class="w-full"
          ></wa-input>
        </div>

        {#each formErrors as error}
          <AlertBar message={error} type="error" />
        {/each}

        <div class="mt-4 flex justify-end">
          <wa-button type="submit" variant="brand" class="w-full" disabled={isFormButtonDisabled}>
            Save
            <wa-icon slot="end" name="arrow-right"></wa-icon>
          </wa-button>
        </div>
      </form>
    </div>
  </wa-card>
</div>
