<script lang="ts">
  import { PLAN_NAMES, SubscriptionType } from 'pockethost'
  import { userStore } from '$util/stores'
  import { onMount } from 'svelte'
  import PricingCard from '$src/routes/(static)/pricing/PricingCard.svelte'

  onMount(() => {
    window.createLemonSqueezy()
  })
</script>

<PricingCard
  name={`${PLAN_NAMES[SubscriptionType.Flounder]}`}
  qtyRemaining={1000}
  qtyMax={1000}
  availableText="Super Secret Stealth Mode Pre Black Friday, Pre Cyber Monday Earlybird Presale 20% Off Discount Code Special"
  description="Epic elite! The Flounder's Edition is almost as good as the Founder's edition, and you'll help PocketHost go global"
  priceMonthly={[359, 'once, use forever', 299]}
  priceAnnually={[159, 'year (save 55%)', 99]}
  checkoutMonthURL="https://store.pockethost.io/buy/9ff8775b-6b9e-4aa8-a0ab-dc5e58e25408?checkout[custom][user_id]={$userStore?.id}&checkout[email]={$userStore?.email}&checkout[discount_code]=FLPRESALE24"
  checkoutYearURL="https://store.pockethost.io/buy/82d79f7c-64f6-4c2b-9f58-dcc8951f1cdd?checkout[custom][user_id]={$userStore?.id}&checkout[email]={$userStore?.email}&checkout[discount_code]=FLPRESALE24"
  features={[
    `Everything in the ${PLAN_NAMES[SubscriptionType.Premium]} tier`,
    `Commemorative Flounder's badge`,
    `PocketHost t-shirt`,
    `-Girlfriend`,
  ]}
  fundingGoals={[
    `Global regions (approx 40)`,
    `Global low latency from anywhere`,
    `PITR (Point-in-Time-Recovery)`,
    `Dedicated instances`,
  ]}
/>
