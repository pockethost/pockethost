<script lang="ts">
  import PricingCard from '$src/routes/(static)/pricing/PricingCard.svelte'
  import { PLAN_NAMES, SubscriptionType } from 'pockethost'
  import PricingTable from './PricingTable.svelte'
  import { userStore } from '$util/stores'
  import FlounderCard from '$src/routes/(app)/account/FlounderCard.svelte'
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
        <FlounderCard
          comingSoonText="ON SALE BLACK FRIDAY"
          comingSoon
          startDate={new Date(2024, 10, 29)}
        />
      </div>
    </div>
  </div>

  <div class="p-6">
    <PricingTable />
  </div>
</div>
