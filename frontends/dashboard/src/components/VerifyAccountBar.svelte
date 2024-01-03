<script lang="ts">
  import { slide } from 'svelte/transition'
  import { isUserLoggedIn, isUserVerified } from '$util/stores'
  import { client } from '$src/pocketbase-client'

  const { resendVerificationEmail } = client()

  let isButtonProcessing: boolean = false
  let formError: string = ''

  const handleClick = async () => {
    // Update the state
    isButtonProcessing = true

    try {
      await resendVerificationEmail()
    } catch (error) {
      const e = error as Error
      formError = `Something went wrong with sending the verification email. ${e.message}`
    }

    // Wait a bit after the success before showing the button again
    setTimeout(() => {
      isButtonProcessing = false
    }, 5000)
  }
</script>

{#if $isUserLoggedIn && !$isUserVerified}
  <div class="alert alert-info mb-8">
    <i class="fa-light fa-envelopes"></i>

    <div>Please verify your account by clicking the link in your email</div>

    <div class="text-right">
      {#if isButtonProcessing}
        <div class="btn btn-success">
          <i class="fa-regular fa-check"></i> Sent!
        </div>
      {:else}
        <button
          type="button"
          class="btn btn-outline-secondary btn-sm"
          on:click={handleClick}>Resend Email</button
        >
      {/if}

      {#if formError}
        <div transition:slide class="border-top text-center mt-2 pt-2">
          {formError}
        </div>
      {/if}
    </div>
  </div>
{/if}
