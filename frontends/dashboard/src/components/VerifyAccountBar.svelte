<script lang="ts">
  import { handleResendVerificationEmail } from '$util/database'
  import { slide } from 'svelte/transition'
  import { isUserLoggedIn, isUserVerified } from '$util/stores'

  let isButtonProcessing: boolean = false
  let formError: string = ''

  const handleClick = () => {
    // Update the state
    isButtonProcessing = true

    handleResendVerificationEmail((error) => {
      formError = error

      isButtonProcessing = false
    })

    // Wait a bit after the success before showing the button again
    setTimeout(() => {
      isButtonProcessing = false
    }, 5000)
  }
</script>

{#if $isUserLoggedIn && !$isUserVerified}
  <div class="alert alert-info mb-8">
    <i class="fa-regular fa-envelopes"></i>

    <div>Please verify your account by clicking the link in your email</div>

    <div class="text-right">
      {#if isButtonProcessing}
        <div class="btn btn-success">
          <i class="fa-regular fa-check"></i> Sent!
        </div>
      {:else}
        <button
          type="button"
          class="btn btn-outline-secondary"
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
