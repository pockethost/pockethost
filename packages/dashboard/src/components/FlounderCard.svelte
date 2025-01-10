<script lang="ts">
  import { PLAN_NAMES, SubscriptionType } from 'pockethost/common'
  import { stats, userStore } from '$util/stores'
  import PricingCard from '$components/PricingCard.svelte'

  export let priceMonthly: [number, string?, number?] = [
    359,
    'once, use forever',
  ]
  export let startDate: Date | null = null
  export let endDate: Date | null = null

  const logInFirst = () => {
    alert('Please log in and verify your account first.')
    window.location.href = '/login'
  }
</script>

<PricingCard
  name={`${PLAN_NAMES[SubscriptionType.Flounder]}`}
  qtyRemaining={1000 - $stats.total_flounder_subscribers}
  qtyMax={1000}
  description="Epic elite! The Flounder's Edition is almost as good as the Founder's edition, and you'll help PocketHost go global."
  {priceMonthly}
  requireAuthenticatedUser
  checkoutMonthURL="https://store.pockethost.io/buy/d4b2d062-429c-49b4-9cdc-853aaeb17e20?checkout[custom][user_id]=${$userStore?.id}&checkout[email]=${$userStore?.email}"
  features={[
    `Unlimited instances`,
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
