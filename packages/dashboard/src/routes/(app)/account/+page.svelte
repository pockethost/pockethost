<script lang="ts">
  import { userSubscriptionType } from '$util/stores'
  import { PLAN_NAMES, SubscriptionType } from 'pockethost'
  import { userStore } from '$util/stores'
  import { onMount } from 'svelte'
  import PricingCard from '$src/routes/(static)/pricing/PricingCard.svelte'
  import FlounderCard from './FlounderCard.svelte'

  $: checkoutAnnualUrl = `https://store.pockethost.io/buy/82d79f7c-64f6-4c2b-9f58-dcc8951f1cdd?checkout[custom][user_id]=${$userStore?.id}&checkout[email]=${$userStore?.email}&checkout[discount_code]=FLPRESALE24`
  $: checkoutLifeUrl = `https://store.pockethost.io/buy/9ff8775b-6b9e-4aa8-a0ab-dc5e58e25408?checkout[custom][user_id]=${$userStore?.id}&checkout[email]=${$userStore?.email}&checkout[discount_code]=FLPRESALE24`

  onMount(() => {
    window.createLemonSqueezy()
  })
</script>

<div class="text-xl">My Account</div>

<div>
  Your plan: <span class="text-success font-bold"
    >{PLAN_NAMES[$userSubscriptionType]}</span
  >
</div>
<div>
  Need to change or cancel? <a href="/support" class="link">Contact support</a>
</div>
<div class="w-[300px] m-4">
  <FlounderCard />
</div>
