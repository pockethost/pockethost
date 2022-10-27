<script>
  import { handleResendVerificationEmail } from '$util/database'
  import AlertBar from '$components/AlertBar.svelte'
  import { isUserLoggedIn, isUserVerified } from '$util/stores'
</script>

{#if $isUserLoggedIn && !$isUserVerified}
  <div class="container py-3">
    <AlertBar>
      <div class="d-flex flex-wrap align-items-center justify-content-center gap-3">
        <i class="bi bi-envelope-exclamation" />

        <div>Please verify your account by clicking the link in your email</div>

        <button
          type="button"
          class="btn btn-outline-secondary"
          on:click={handleResendVerificationEmail}>Resend Email</button
        >
      </div>
    </AlertBar>
  </div>
{/if}
