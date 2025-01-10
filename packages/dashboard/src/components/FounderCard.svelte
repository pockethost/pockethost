<script lang="ts">
  import { PLAN_NAMES, SubscriptionType } from 'pockethost/common'
  import { userStore } from '$util/stores'
  import PricingCard from './PricingCard.svelte'
</script>

<PricingCard
  name={`${PLAN_NAMES[SubscriptionType.Founder]}`}
  qtyRemaining={0}
  qtyMax={100}
  description="Super elite! The Founder's Edition is our way of saying thanks for supporting PocketHost in these early days. Choose between lifetime and annual options."
  priceMonthly={[299, 'once, use forever']}
  priceAnnually={[99, 'year (save 55%)']}
  checkoutMonthURL="https://store.pockethost.io/checkout/buy/e71cbfb5-cec3-4745-97a7-d877f6776503?checkout[custom][user_id]={$userStore?.id}"
  checkoutYearURL="https://store.pockethost.io/checkout/buy/e5660329-5b99-4ed6-8f36-0d387803e1d6?checkout[custom][user_id]={$userStore?.id}"
  features={[
    `Everything in the ${PLAN_NAMES[SubscriptionType.Premium]} tier`,
    'Unlimited instances',
    'Unlimited bandwidth',
    'Unlimited storage & files',
    `Private #onlyfounders Discord channel`,
    `Priority support`,
    `Commemorative Founder's badge`,
    `PocketHost t-shirt`,
    `Girlfriend`,
  ]}
/>
