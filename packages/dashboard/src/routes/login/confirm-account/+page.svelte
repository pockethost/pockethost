<script lang="ts">
  import { browser } from '$app/environment'
  import { page } from '$app/stores'
  import AlertBar from '$components/AlertBar.svelte'
  import { handleAccountConfirmation } from '$util/database'

  let token: string | null = ''
  let formError: string = ''

  // Check for a token in the URL
  $: {
    if (browser) {
      token = $page?.url?.searchParams?.get('token')

      if (token) {
        handleLoad()
      } else {
        // No token was found in the URL
        formError = 'Invalid link'
      }
    }
  }

  const handleLoad = async () => {
    if (!token) {
      throw new Error(`Expected valid token here`)
    }
    await handleAccountConfirmation(token, (error) => {
      formError = error
    })
  }
</script>

<svelte:head>
  <title>Confirming Your Account - PocketHost</title>
</svelte:head>

<div class="page-bg">
  <div class="card text-center">
    <h2 class="mb-4">Confirming Your Account</h2>

    {#if formError}
      <AlertBar icon="bi bi-exclamation-triangle-fill" text={formError} />
    {:else}
      <div class="spinner-border mx-auto" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  .page-bg {
    background-color: #222;
    background-image: var(--gradient-light-soft-blue-vertical);
    display: flex;
    align-items: center;
    justify-content: center;
    height: calc(100vh - 91px);
    padding: 0 18px;
  }

  .card {
    border: 0;
    box-shadow: var(--soft-box-shadow);
    padding: 24px;
    max-width: 425px;
    width: 100%;
    border-radius: 24px;
  }

  @media screen and (min-width: 768px) {
    .card {
      padding: 48px;
    }
  }
</style>
