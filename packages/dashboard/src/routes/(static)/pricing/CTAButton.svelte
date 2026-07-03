<script lang="ts">
  import { goto } from '$app/navigation'
  import { INSTANCE_MONTHLY_PV_ID, createLemonSqueezyCheckout } from '$util/lemonsqueezy'
  import { checkoutIntentUrl } from '$util/checkoutIntent'
  import UserLoggedIn from '$components/guards/UserLoggedIn.svelte'
  import UserLoggedOut from '$components/guards/UserLoggedOut.svelte'

  export let fixed = false

  let loading = false

  const startCheckout = async () => {
    if (loading) return
    loading = true
    try {
      const url = await createLemonSqueezyCheckout(INSTANCE_MONTHLY_PV_ID)
      window.location.href = url
    } catch (err) {
      console.error(err)
      alert('Could not start checkout. Please try again.')
    } finally {
      loading = false
    }
  }

  const startSignupCheckout = async () => {
    await goto(checkoutIntentUrl(INSTANCE_MONTHLY_PV_ID))
  }
</script>

<UserLoggedIn>
  <wa-button
    variant="warning"
    size="l"
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
    size="l"
    class={fixed ? 'w-full rounded-none fixed bottom-0' : ''}
    onclick={startSignupCheckout}
  >
    Create account & subscribe
  </wa-button>
</UserLoggedOut>
