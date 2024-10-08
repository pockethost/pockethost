<script lang="ts">
  import PricingCard from '$src/routes/(static)/pricing/PricingCard.svelte'
  import { PLAN_NAMES, SubscriptionType } from 'pockethost'
  import PricingTable from './PricingTable.svelte'
  import { userStore } from '$util/stores'
</script>

<div class=" mt-2">
  <div
    class="mx-auto max-w-4xl text-center font-semibold leading-7 text-primary text-4xl"
  >
    Pricing
  </div>

  <div class="mt-10 bg-neutral text-neutral-content p-5 flex flex-col mx-auto">
    <div class="text-xl text-center pb-5">Rare deals</div>
    <div class="flex flex-wrap justify-center">
      <div class="w-[300px] mx-4">
        <PricingCard
          name={`${PLAN_NAMES[SubscriptionType.Lifetime]}`}
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
      </div>

      <div class="w-[300px] mx-4">
        <PricingCard
          comingSoonText="ON SALE BLACK FRIDAY"
          comingSoon
          name={`${PLAN_NAMES[SubscriptionType.Flounder]}`}
          qtyRemaining={1000}
          qtyMax={1000}
          description="Epic elite! The Flounder's Edition is almost as good as the Founder's edition, and you'll help PocketHost go global"
          priceMonthly={[359, 'once, use forever']}
          priceAnnually={[159, 'year (save 30%)']}
          checkoutMonthURL="https://store.pockethost.io/buy/82d79f7c-64f6-4c2b-9f58-dcc8951f1cdd?checkout[custom][user_id]={$userStore?.id}"
          checkoutYearURL="https://store.pockethost.io/buy/9ff8775b-6b9e-4aa8-a0ab-dc5e58e25408?checkout[custom][user_id]={$userStore?.id}"
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
      </div>
    </div>
  </div>

  <div class="p-6">
    <PricingTable />
  </div>
  <div class="text-neutral-content text-sm p-2">
    Learn more about our <a href="/docs/pricing-ethos" class="link"
      >pricing ethos</a
    >
    and <a href="/terms" class="link">Fair Use</a>.
  </div>
</div>
