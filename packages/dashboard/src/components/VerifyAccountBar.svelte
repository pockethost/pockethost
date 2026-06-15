<script lang="ts">
  import { slide } from 'svelte/transition'
  import { isUserVerified } from '$util/stores'
  import { client } from '$src/pocketbase-client'
  import UserLoggedIn from './guards/UserLoggedIn.svelte'

  const { resendVerificationEmail } = client()

  let isButtonProcessing: boolean = false
  let formError: string = ''

  const handleClick = async () => {
    isButtonProcessing = true

    try {
      await resendVerificationEmail()
    } catch (error) {
      const e = error as Error
      formError = `Something went wrong with sending the verification email. ${e.message}`
    }

    setTimeout(() => {
      isButtonProcessing = false
    }, 5000)
  }
</script>

<UserLoggedIn>
  {#if !$isUserVerified}
    <wa-callout variant="brand" class="p-4">
      <wa-icon slot="icon" name="envelope"></wa-icon>
      <div class="flex flex-col md:flex-row justify-between gap-4 w-full">
        <div class="flex gap-4 items-center text-start">
          <div>Please verify your account by clicking the link in your email</div>
        </div>

        <div class="text-right w-full md:w-auto">
          {#if isButtonProcessing}
            <wa-button variant="success" size="small" disabled>
              <wa-icon slot="start" name="check"></wa-icon>
              Sent!
            </wa-button>
          {:else}
            <wa-button
              type="button"
              variant="neutral"
              size="small"
              appearance="outline"
              class="w-full"
              onclick={handleClick}
            >
              Resend Email
            </wa-button>
          {/if}

          {#if formError}
            <div transition:slide class="border-top text-center mt-2 pt-2">
              {formError}
            </div>
          {/if}
        </div>
      </div>
    </wa-callout>
  {/if}
</UserLoggedIn>
