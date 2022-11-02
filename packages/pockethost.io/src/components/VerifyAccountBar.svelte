<script lang="ts">
  import AlertBar from '$components/AlertBar.svelte'
  import { AlertTypes } from '$components/AlertBar.types'
  import { handleResendVerificationEmail } from '$util/database'
  import { isUserLoggedIn, isUserVerified } from '$util/stores'

  let defaultAlertBarType: AlertTypes = AlertTypes.Warning

  let isButtonProcessing: boolean = false
  let formError: string = ''

  const handleClick = () => {
    // Reset the alert type if resubmitted
    defaultAlertBarType = AlertTypes.Warning

    // Update the state
    isButtonProcessing = true

    handleResendVerificationEmail((error) => {
      formError = error
      defaultAlertBarType = AlertTypes.Danger
      isButtonProcessing = false
    })

    // Wait a bit after the success before showing the button again
    setTimeout(() => {
      isButtonProcessing = false
    }, 5000)
  }
</script>

{#if $isUserLoggedIn && !$isUserVerified}
  <div class="container py-3">
    <AlertBar alertType={defaultAlertBarType}>
      <div class="d-flex flex-wrap align-items-center justify-content-center gap-3">
        <i class="bi bi-envelope-exclamation" />

        <div>Please verify your account by clicking the link in your email</div>

        {#if isButtonProcessing}
          <div class="success-icon">
            <i class="bi bi-check-square" />
            Sent!
          </div>
        {:else}
          <button type="button" class="btn btn-outline-secondary" on:click={handleClick}
            >Resend Email</button
          >
        {/if}
      </div>

      {#if formError}
        <div class="border-top text-center mt-2 pt-2">{formError}</div>
      {/if}
    </AlertBar>
  </div>
{/if}

<style>
  .success-icon {
    padding: 0.375rem 0.75rem;
  }
</style>
