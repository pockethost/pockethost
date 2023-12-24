<script>
  import AuthStateGuard from '$components/helpers/AuthStateGuard.svelte'
  import { PLAN_NAMES, SubscriptionType } from '$shared'
  import { DISCORD_URL } from '$src/env'
  import { client } from '$src/pocketbase-client'
  import { userSubscriptionType } from '$util/stores'
  import { onMount } from 'svelte'
  import { writable } from 'svelte/store'
  import Card from './Card.svelte'
  import FAQItem from './FAQItem.svelte'

  const founderMembershipsRemaining = writable(0)

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
  <div class="m-10">
    <h2 class="text-2xl">My Account</h2>
    <h2>Current Plan: {PLAN_NAMES[$userSubscriptionType]}</h2>
    <h2>Email: {client().user()?.email}</h2>
  </div>

  <Card
    name={PLAN_NAMES[SubscriptionType.Legacy]}
    active={$userSubscriptionType === SubscriptionType.Legacy}
    features={[
      `Access to existing projects and legacy features`,
      `Unlimited (fair use) bandwith, storage, and CPU`,
      `Community support via Discord`,
      `FTP access to PocketBase data, hooks, migrations, and files`,
      `Run every version of PocketBase`,
    ]}
  />

  <Card
    name={PLAN_NAMES[SubscriptionType.Free]}
    active={$userSubscriptionType === SubscriptionType.Free}
    features={[
      `1 project`,
      `Unlimited (fair use) bandwith, storage, and CPU`,
      `Community support via Discord`,
      `FTP access to PocketBase data, hooks, migrations, and files`,
      `Run every version of PocketBase`,
    ]}
  />

  <Card
    name={PLAN_NAMES[SubscriptionType.Premium]}
    active={$userSubscriptionType === SubscriptionType.Premium}
    upgradable
    features={[
      `Everything in the Hacker/free plan`,
      `Unlimited projects`,
      `Priority support channel on Discord`,
    ]}
    prices={[
      { title: `$20/mo`, link: `https://buy.stripe.com/fZe6sd8Mkfc30Kc4gg` },
      {
        title: `$199/yr (save 20%)`,
        link: `https://buy.stripe.com/bIYeYJbYwd3VdwY289`,
      },
    ]}
  >
    <p>
      We have a lot of ideas for premium features. Please check our <a
        class="link"
        target="_blank"
        href="https://discord.com/channels/1128192380500193370/1180219900107706409"
        >Discord discussion</a
      > to join in the conversation.
    </p></Card
  >

  <Card
    name={`🎉 🎈 Founder's Edition 🎊 🍄`}
    active={$userSubscriptionType === SubscriptionType.Lifetime}
    features={[
      `Everything in the Pro tier`,
      `Founder's badge on Discord`,
      `Official PocketHost mug or tee`,
    ]}
    startLimit={100}
    limit={$founderMembershipsRemaining}
    upgradable
    prices={[
      {
        title: `$99/yr (50% savings)`,
        link: `https://buy.stripe.com/aEUdUF7Igfc350s28a`,
      },
      {
        title: `$299 lifetime`,
        link: `https://buy.stripe.com/7sIg2N6Ecgg70KcdQT`,
      },
    ]}
  >
    <p class="text-info text-xl">
      Super elite! The Founder's Edition is our way of saying thanks for
      supporting PocketHost in these early days.
    </p>
  </Card>

  <!-- FAQ section -->
  <div
    class="mx-auto max-w-7xl divide-y divide-gray-500 px-6 py-24 sm:py-32 lg:px-8 lg:py-40"
  >
    <h2 class="text-2xl font-bold leading-10 tracking-tight">
      Frequently asked questions
    </h2>

    <dl class="mt-10 space-y-8 divide-y divide-gray-500">
      <FAQItem question={`What is the "Legacy Plan"?`}>
        <p class="mb-4">
          Legacy accounts have access to existing projects and features, but
          cannot create new projects or use new features.
        </p>
        <p>
          If you upgrade to a paid plan and then downgrade again, you will still
          have access to your Legacy projects and features, but any new projects
          and features created on a paid plan will no longer work.
        </p>
      </FAQItem>

      <FAQItem question="Giving Back to the Open Source Community">
        <p class="mb-4">
          PocketHost is committed to giving back to the open source community
          that helps create PocketHost and PocketBase.
        </p>
        <p class="mb-4">
          10% of net proceeds (after expenses) are donated back to the
          community. Specifically, PocketHost makes donations to the PocketBase
          project and major contributors to the PocketHost project.
        </p>
        <p>
          In addition, 1% of membership fees is collected by Stripe to reduce
          carbon footprints around the world.
        </p>
      </FAQItem>

      <FAQItem question="Fair Use Policy">
        <p class="mb-4">
          When we say 'unlimited', we mean it in the Fair Use sense of the word.
          Obviously, everything has limits. In our study of PocketHost usage
          patterns, we found that even the busiest and most successful
          PocketHost instances rarely stress our system.
        </p>
        <p class="mb-4">
          PocketHost is a haven for developers who want to launch and iterate
          quickly on ideas without worrying about metering and infrastructure.
        </p>
        <p class="mb-4">
          If your app gets big and it starts affecting the system, we'll talk
          about an enterprise plan or a dedicated setup.
        </p>
        <p>
          Please enjoy PocketHost knowing that you can use as much storage,
          bandwidth, and CPU as your application requires under normal operating
          conditions. Let us handle the hosting so you can get back to work.
        </p>
      </FAQItem>

      <FAQItem question="Cancellation and Refunds">
        <p class="mb-4">
          Short version: We only want your money if you are happy.
        </p>
        <p class="mb-4">
          Long version: If you need to cancel your membership for any reason,
          please <a class="link" href={DISCORD_URL}
            >contact @noaxis on Discord</a
          >. If you cancel within the first 5 days of a signup or renewal, we'll
          refund the full amount. Otherwise, we'll pro-rate it. Sound good?
        </p>
        <p>
          If you create additional instances and then downgrade to the free
          plan, the extra instances will remain accessible in your dashboard,
          but they will not run.
        </p>
      </FAQItem>

      <!-- More questions... -->
    </dl>
  </div>
</AuthStateGuard>
