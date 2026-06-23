<script lang="ts">
  import FeatureTab from '$components/FeatureTab.svelte'
  import AlertBar from '$components/AlertBar.svelte'
  import { client } from '$src/pocketbase-client'
  import { userStore } from '$util/stores'

  const { requestEmailChange } = client()

  let newEmail = ''
  let formErrors: string[] = []
  let userShouldCheckTheirEmail = false
  let submittedEmail = ''

  $: isFormButtonDisabled = newEmail.trim().length === 0

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault()

    formErrors = []

    const trimmed = newEmail.trim()
    if (trimmed.toLowerCase() === $userStore?.email?.toLowerCase()) {
      formErrors = ['New email must be different from your current email.']
      return
    }

    try {
      await requestEmailChange(trimmed)
      submittedEmail = trimmed
      userShouldCheckTheirEmail = true
    } catch (error) {
      if (error instanceof Error) {
        formErrors = client().parseError(error)
      } else {
        formErrors = ['Something went wrong requesting your email change.']
      }
    }
  }
</script>

<svelte:head>
  <title>Change Email - PocketHost</title>
</svelte:head>

<FeatureTab title="Change email">
  <div class="account-card">
    <div class="account-card-body">
      {#if userShouldCheckTheirEmail}
        <div class="text-center py-4">
          <h2 class="text-lg font-semibold text-white mb-3">Check your email</h2>
          <p class="text-white/80">
            A confirmation link has been sent to <br /><strong class="text-white">{submittedEmail}</strong>
          </p>
          <p class="text-sm text-neutral-400 mt-4">
            Your current email stays active until you confirm from the new inbox with your password.
          </p>
          <p class="mt-6">
            <a href="/account" class="account-stat-link">Back to account</a>
          </p>
        </div>
      {:else}
        <form class="max-w-md" onsubmit={handleSubmit}>
          <p class="text-sm text-neutral-400 mb-6">
            Enter your new email address. We will send a confirmation link there. Your current email stays active until
            you confirm.
          </p>

          <div class="auth-field-group mb-4">
            <label class="auth-label" for="newEmail">New email address</label>
            <wa-input
              type="email"
              id="newEmail"
              placeholder="name@example.com"
              value={newEmail}
              oninput={(e: Event) => (newEmail = (e.currentTarget as HTMLInputElement).value)}
              required
              autocomplete="email"
              class="w-full"
            ></wa-input>
          </div>

          {#each formErrors as error}
            <AlertBar message={error} type="error" />
          {/each}

          <div class="flex items-center gap-4 mt-6">
            <button type="submit" class="auth-submit" disabled={isFormButtonDisabled}>
              Send confirmation link
              <wa-icon name="arrow-right"></wa-icon>
            </button>
            <a href="/account" class="account-stat-link text-sm">Cancel</a>
          </div>
        </form>
      {/if}
    </div>
  </div>
</FeatureTab>
