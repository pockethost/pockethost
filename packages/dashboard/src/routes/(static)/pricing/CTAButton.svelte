<script lang="ts">
  import { userStore } from '$util/stores'
  import { FLOUNDER_CHECKOUT_VARIANT_ID, lemonsqueezyCheckoutUrl } from '$util/lemonsqueezy'
  import UserLoggedIn from '$components/guards/UserLoggedIn.svelte'
  import UserLoggedOut from '$components/guards/UserLoggedOut.svelte'

  export let fixed = false

  $: checkoutUrl =
    $userStore?.id && $userStore?.email
      ? lemonsqueezyCheckoutUrl(FLOUNDER_CHECKOUT_VARIANT_ID, $userStore.id, $userStore.email)
      : undefined
</script>

<UserLoggedIn>
  <wa-button
    variant="warning"
    size="large"
    class={fixed ? 'w-full rounded-none fixed bottom-0' : ''}
    style="z-index: 1000"
    href={checkoutUrl}
  >
    Unlock Access Now
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
