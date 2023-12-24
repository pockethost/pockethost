<script>
  import { DISCORD_URL } from '$src/env'
  import FAQItem from '$src/routes/account/FAQItem.svelte'
</script>

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
        PocketHost is committed to giving back to the open source community that
        helps create PocketHost and PocketBase.
      </p>
      <p class="mb-4">
        10% of net proceeds (after expenses) are donated back to the community.
        Specifically, PocketHost makes donations to the PocketBase project and
        major contributors to the PocketHost project.
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
        patterns, we found that even the busiest and most successful PocketHost
        instances rarely stress our system.
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
        please <a class="link" href={DISCORD_URL}>contact @noaxis on Discord</a
        >. If you cancel within the first 5 days of a signup or renewal, we'll
        refund the full amount. Otherwise, we'll pro-rate it. Sound good?
      </p>
      <p>
        If you create additional instances and then downgrade to the free plan,
        the extra instances will remain accessible in your dashboard, but they
        will not run.
      </p>
    </FAQItem>

    <!-- More questions... -->
  </dl>
</div>
