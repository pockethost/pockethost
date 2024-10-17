<script lang="ts">
  import { PLAN_NAMES, SubscriptionType } from 'pockethost'
  import { stats, userStore } from '$util/stores'
  import { onMount } from 'svelte'
  import PricingCard from '$src/routes/(static)/pricing/PricingCard.svelte'
  import { client } from '$src/pocketbase-client'
  import { writable } from 'svelte/store'

  export let priceMonthly: [number, string?, number?] = [
    359,
    'once, use forever',
    299,
  ]
  export let priceAnnually: [number, string?, number?] = [
    159,
    'year (save 55%)',
    99,
  ]
  export let comingSoonText = ''
  export let comingSoon = false
  export let startDate: Date | null = null
</script>

<PricingCard
  name={`${PLAN_NAMES[SubscriptionType.Flounder]}`}
  qtyRemaining={1000 - $stats.total_flounder_subscribers}
  qtyMax={1000}
  {comingSoonText}
  {comingSoon}
  {startDate}
  availableText="Super Secret Stealth Mode Pre Black Friday, Pre Cyber Monday Earlybird Presale 20% Off Discount Code Special"
  description="Epic elite! The Flounder's Edition is almost as good as the Founder's edition, and you'll help PocketHost go global"
  {priceMonthly}
  {priceAnnually}
  checkoutMonthURL="https://store.pockethost.io/buy/9ff8775b-6b9e-4aa8-a0ab-dc5e58e25408?checkout[custom][user_id]={$userStore?.id}&checkout[email]={$userStore?.email}&checkout[discount_code]=G0MTI0OQ"
  checkoutYearURL="https://store.pockethost.io/buy/82d79f7c-64f6-4c2b-9f58-dcc8951f1cdd?checkout[custom][user_id]={$userStore?.id}&checkout[email]={$userStore?.email}&checkout[discount_code]=G0MTI0OQ"
  features={[
    `Everything in the ${PLAN_NAMES[SubscriptionType.Premium]} tier`,
    `Commemorative Flounder's badge`,
    `PocketHost t-shirt`,
    `#onlyflounders private discord channel`,
    `-Girlfriend`,
  ]}
  fundingGoals={[
    `Global regions (approx 40)`,
    `Global low latency from anywhere`,
  ]}
/>
