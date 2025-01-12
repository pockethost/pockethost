<script lang="ts">
  import { PLAN_NAMES, SubscriptionType } from 'pockethost/common'
  import { stats, userStore, isUserLoggedIn } from '$util/stores'
  import PricingCard from '$components/PricingCard.svelte'

  const TOTAL_QTY = 150
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
  qtyRemaining={TOTAL_QTY - $stats.total_flounder_subscribers}
  qtyMax={TOTAL_QTY}
  description="Epic elite! The Flounder's Edition is almost as good as the Founder's edition, and you'll help PocketHost go global."
  {priceMonthly}
  requireAuthenticatedUser
  checkoutMonthURL={$isUserLoggedIn
    ? 'https://store.pockethost.io/buy/d4b2d062-429c-49b4-9cdc-853aaeb17e20?checkout[custom][user_id]=${$userStore?.id}&checkout[email]=${$userStore?.email}'
    : `/get-started`}
  features={[
    'Unlimited instances',
    'Unlimited bandwidth',
    'Unlimited storage & files',
    `Private #onlyflounders Discord channel`,
    `Priority support`,
    `Commemorative Flounder's badge`,
    `PocketHost t-shirt`,
    `-Girlfriend`,
  ]}
/>
