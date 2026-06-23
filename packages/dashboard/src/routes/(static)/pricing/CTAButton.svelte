<script lang="ts">
  import { FLOUNDER_LIFETIME_PV_ID, createLemonSqueezyCheckout } from '$util/lemonsqueezy'
  import UserLoggedIn from '$components/guards/UserLoggedIn.svelte'
  import UserLoggedOut from '$components/guards/UserLoggedOut.svelte'

  export let fixed = false

  let loading = false

  const startCheckout = async () => {
    if (loading) return
    loading = true
    try {
      const url = await createLemonSqueezyCheckout(FLOUNDER_LIFETIME_PV_ID)
      window.location.href = url
    } catch (err) {
      console.error(err)
      alert('Could not start checkout. Please try again.')
    } finally {
      loading = false
    }
  }
</script>

<UserLoggedIn>
  <wa-button
    variant="warning"
    size="large"
    class={fixed ? 'w-full rounded-none fixed bottom-0' : ''}
    style="z-index: 1000"
    disabled={loading}
    onclick={startCheckout}
  >
    {loading ? 'Loading…' : 'Unlock Access Now'}
  </wa-button>
</UserLoggedIn>
<UserLoggedOut>
  <wa-button
    variant="warning"
    size="large"
    class={fixed ? 'w-full rounded-none fixed bottom-0' : ''}
    href="/get-started"
  >
    Get Started
  </wa-button>
</UserLoggedOut>
