<script lang="ts">
  import AuthStateGuard from '$src/components/helpers/AuthStateGuard.svelte'
  import PricingCard from '$src/routes/account/PricingCard.svelte'
  import { isUserLegacy } from '$util/stores'
  import { PLAN_NAMES, SubscriptionType } from 'pockethost'
  import PricingTable from '$src/routes/pricing/PricingTable.svelte'
  import { isUserFounder, userStore, userSubscriptionType } from '$util/stores'
</script>

<AuthStateGuard>
  <div class="">
    <main>
      <div class="mx-auto mt-16 max-w-7xl px-6 sm:mt-32 lg:px-8">
        <div class="mx-auto max-w-4xl text-center">
          <h1 class="text-base font-semibold leading-7 text-primary">
            Pricing
          </h1>
        </div>

        <div>
          PocketHost is made for indie hackers, makers, and small businesses.
          Our pricing is simple and transparent. We offer a free tier, a premium
          tier, and a limited supply of lifetime tiers while we bootstrap.
        </div>

        <div class="m-10 bg-neutral p-10 rounded-lg">
          <div class="text-neutral-content text-xl text-center p-10">
            Insanely special deals
          </div>
          <PricingCard
            name={`${PLAN_NAMES[SubscriptionType.Lifetime]}`}
            qtyRemaining={0}
            qtyMax={100}
            description="Super elite! The Founder's Edition is our way of saying thanks for supporting PocketHost in these early days. Choose between lifetime and annual options."
            priceMonthly={[299, 'once, use forever']}
            priceAnnually={[99, 'year (save 55%)']}
            checkoutMonthURL="https://store.pockethost.io/checkout/buy/e71cbfb5-cec3-4745-97a7-d877f6776503?checkout[custom][user_id]={$userStore?.id}"
            checkoutYearURL="https://store.pockethost.io/checkout/buy/e5660329-5b99-4ed6-8f36-0d387803e1d6?checkout[custom][user_id]={$userStore?.id}"
          />
        </div>

        <PricingTable />
      </div>
    </main>
  </div>
</AuthStateGuard>
