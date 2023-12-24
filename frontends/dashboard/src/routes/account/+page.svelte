<script lang="ts">
  import AuthStateGuard from '$components/helpers/AuthStateGuard.svelte'
  import FAQItem from '$src/routes/account/FAQItem.svelte'
  import PricingCard from '$src/routes/account/PricingCard.svelte'
  import { PLAN_NAMES, SubscriptionType } from '$shared'
  import { DISCORD_URL } from '$src/env'
  import { client } from '$src/pocketbase-client'
  import { isUserLegacy, userSubscriptionType } from '$util/stores'
  import { onMount } from 'svelte'
  import { writable } from 'svelte/store'
  import Card from './Card.svelte'

  const founderMembershipsRemaining = writable(0)

  /** @type {"monthly"|"annually"} */
  let planSchedule = 'month'

  onMount(async () => {
    try {
      const membershipCount = await client()
        .client.collection('settings')
        .getFirstListItem(`name = 'founders-edition-count'`)
      founderMembershipsRemaining.set(membershipCount.value)
    } catch (e) {
      console.error(e)
    }
  })
</script>

<AuthStateGuard>
  <div class="">
    <main>
      <div class="mx-auto mt-16 max-w-7xl px-6 sm:mt-32 lg:px-8">
        <div class="mx-auto max-w-4xl text-center">
          <h1 class="text-base font-semibold leading-7 text-indigo-400">
            Pricing
          </h1>
          <p
            class="mt-2 text-4xl font-bold tracking-tight text-white sm:text-5xl"
          >
            Pricing plans for teams of&nbsp;all&nbsp;sizes
          </p>
        </div>

        <p
          class="mx-auto mt-6 max-w-2xl text-center text-lg leading-8 text-gray-300"
        >
          Choose an affordable plan that’s packed with the best features for
          engaging your audience, creating customer loyalty, and driving sales.
        </p>

        <div class="mt-16 flex justify-center">
          <fieldset
            class="grid grid-cols-2 gap-x-1 rounded-full bg-white/5 p-1 text-center text-xs font-semibold leading-5 text-white"
          >
            <legend class="sr-only">Payment frequency</legend>

            <!-- Checked: "bg-indigo-500" -->
            <label
              class={`cursor-pointer rounded-full px-2.5 py-1 ${
                planSchedule === 'month' && 'bg-indigo-500'
              }`}
            >
              <input
                type="radio"
                bind:group={planSchedule}
                name="frequency"
                value="month"
                class="sr-only"
              />
              <span>Monthly</span>
            </label>

            <!-- Checked: "bg-indigo-500" -->
            <label
              class={`cursor-pointer rounded-full px-2.5 py-1 ${
                planSchedule === 'year' && 'bg-indigo-500'
              }`}
            >
              <input
                type="radio"
                bind:group={planSchedule}
                name="frequency"
                value="year"
                class="sr-only"
              />
              <span>Annually</span>
            </label>
          </fieldset>
        </div>

        <div
          class="mx-auto mt-10 grid max-w-md grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3"
        >
          {#if $isUserLegacy}
            <PricingCard
              name={PLAN_NAMES[SubscriptionType.Legacy]}
              description="The essentials to provide your best work."
              priceMonthly={0}
              priceAnnually={0}
              {planSchedule}
              active={$userSubscriptionType === SubscriptionType.Legacy}
              features={[
                `Access to existing projects and legacy features`,
                `Unlimited (fair use) bandwith, storage, and CPU`,
                `Community support via Discord`,
                `FTP access to PocketBase data, hooks, migrations, and files`,
                `Run every version of PocketBase`,
              ]}
            />
          {:else}
            <PricingCard
              name={PLAN_NAMES[SubscriptionType.Free]}
              description="The essentials to provide your best work."
              priceMonthly={0}
              priceAnnually={0}
              {planSchedule}
              active={$userSubscriptionType === SubscriptionType.Free}
              features={[
                `1 project`,
                `Unlimited (fair use) bandwith, storage, and CPU`,
                `Community support via Discord`,
                `FTP access to PocketBase data, hooks, migrations, and files`,
                `Run every version of PocketBase`,
              ]}
            />
          {/if}

          <!-- $199 Plan: https://buy.stripe.com/bIYeYJbYwd3VdwY289 -->
          <PricingCard
            name={PLAN_NAMES[SubscriptionType.Premium]}
            description="The essentials to provide your best work."
            priceMonthly={20}
            priceAnnually={99}
            {planSchedule}
            checkoutMonthURL="https://buy.stripe.com/fZe6sd8Mkfc30Kc4gg"
            checkoutYearURL="https://buy.stripe.com/aEUdUF7Igfc350s28a"
            active={$userSubscriptionType === SubscriptionType.Premium}
            features={[
              `Everything in the Free plan`,
              `Unlimited instances`,
              `Unlimited (fair use) bandwidth, storage, and CPU`,
            ]}
          />

          <PricingCard
            name={PLAN_NAMES[SubscriptionType.Lifetime]}
            description="The essentials to provide your best work."
            priceMonthly={300}
            priceAnnually={300}
            {planSchedule}
            active={$userSubscriptionType === SubscriptionType.Lifetime}
            features={[
              `Everything in the Free plan`,
              `Unlimited instances`,
              `Unlimited (fair use) bandwidth, storage, and CPU`,
              `Founder's badge on Discord`,
              `Official PocketHost mug or tee`,
            ]}
          />
        </div>
      </div>

      <!-- FAQ section -->
      <div
        class="mx-auto max-w-7xl divide-y divide-gray-500 px-6 py-24 sm:py-32 lg:px-8 lg:py-40"
      >
        <h2 class="text-2xl font-bold leading-10 tracking-tight">
          Frequently asked questions
        </h2>

        <dl class="mt-10 space-y-8 divide-y divide-gray-500">
          <FAQItem question="What is the "Legacy Plan"?">
            <p class="mb-4">
              Legacy accounts have access to existing projects and features, but
              cannot create new projects or use new features.
            </p>
            <p>
              If you upgrade to a paid plan and then downgrade again, you will
              still have access to your Legacy projects and features, but any
              new projects and features created on a paid plan will no longer
              work.
            </p>
          </FAQItem>

          <FAQItem question="Giving Back to the Open Source Community">
            <p class="mb-4">
              PocketHost is committed to giving back to the open source
              community that helps create PocketHost and PocketBase.
            </p>
            <p class="mb-4">
              10% of net proceeds (after expenses) are donated back to the
              community. Specifically, PocketHost makes donations to the
              PocketBase project and major contributors to the PocketHost
              project.
            </p>
            <p>
              In addition, 1% of membership fees is collected by Stripe to
              reduce carbon footprints around the world.
            </p>
          </FAQItem>

          <FAQItem question="Fair Use Policy">
            <p class="mb-4">
              When we say 'unlimited', we mean it in the Fair Use sense of the
              word. Obviously, everything has limits. In our study of PocketHost
              usage patterns, we found that even the busiest and most successful
              PocketHost instances rarely stress our system.
            </p>
            <p class="mb-4">
              PocketHost is a haven for developers who want to launch and
              iterate quickly on ideas without worrying about metering and
              infrastructure.
            </p>
            <p class="mb-4">
              If your app gets big and it starts affecting the system, we'll
              talk about an enterprise plan or a dedicated setup.
            </p>
            <p>
              Please enjoy PocketHost knowing that you can use as much storage,
              bandwidth, and CPU as your application requires under normal
              operating conditions. Let us handle the hosting so you can get
              back to work.
            </p>
          </FAQItem>

          <FAQItem question="Cancellation and Refunds">
            <p class="mb-4">
              Short version: We only want your money if you are happy.
            </p>
            <p class="mb-4">
              Long version: If you need to cancel your membership for any
              reason, please <a class="link" href={DISCORD_URL}
                >contact @noaxis on Discord</a
              >. If you cancel within the first 5 days of a signup or renewal,
              we'll refund the full amount. Otherwise, we'll pro-rate it. Sound
              good?
            </p>
            <p>
              If you create additional instances and then downgrade to the free
              plan, the extra instances will remain accessible in your
              dashboard, but they will not run.
            </p>
          </FAQItem>

          <!-- More questions... -->
        </dl>
      </div>
    </main>
  </div>
</AuthStateGuard>
