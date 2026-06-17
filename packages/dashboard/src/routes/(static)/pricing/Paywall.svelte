<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import Testimonials from '$src/components/Testimonials.svelte'
  import { daysUntilFlounderSunset, flounderDaysLeftLabel, FLOUNDER_SALES_END_LABEL } from '$util/flounderSunset'
  import Features from './Features.svelte'
  import FlounderCountdown from './FlounderCountdown.svelte'
  import SignupBox from './SignupBox.svelte'

  let flounderDaysLeft = daysUntilFlounderSunset()

  let interval: ReturnType<typeof setInterval> | undefined

  onMount(() => {
    interval = setInterval(() => {
      flounderDaysLeft = daysUntilFlounderSunset()
    }, 60_000)
  })

  onDestroy(() => {
    if (interval) clearInterval(interval)
  })

  $: flounderBadge = flounderDaysLeft > 0 ? flounderDaysLeftLabel(flounderDaysLeft).toUpperCase() : undefined
</script>

<div class="pricing-page-header">
  <h2 class="pricing-page-title">Affordable Hosting</h2>
  <p class="pricing-page-subtitle">Premium Performance</p>
  <FlounderCountdown />
</div>

<div class="pricing-page-grid">
  <SignupBox
    price="$5 / month"
    priceDetail="per instance"
    title="Starter"
    cta="Pay $5 per instance, up to a maximum of 5 instances."
    features={[
      'Access to all features',
      '7 day risk-free trial',
      'Global Fly ingress, private network routing',
      'Unlimited bandwidth, storage, and CPU',
      'FTP Access',
      'Flexible - only pay for as many as you need',
    ]}
  />
  <SignupBox
    selected
    bestDeal
    price="$25 / month"
    title="Unlimited"
    cta="Pay just $25 monthly to get access to all features with unlimited instances!"
    features={['Everything in the Starter plan', 'Unlimited instances']}
  />
  <SignupBox
    buttonText="Become a Flounder"
    price="$359 once"
    title="Flounder - Lifetime"
    badgeText={flounderBadge}
    badgeUrgent
    cta="Pay once for lifetime Pro hosting. Sales end {FLOUNDER_SALES_END_LABEL}. No new buyers after that date."
    features={[
      'Everything in the Unlimited plan',
      'Lifetime access',
      'No recurring fees',
      'Tee shirt',
      '#onlyflounders private Discord',
      '-Girlfriend',
    ]}
  />
</div>

<div class="relative my-20 w-full max-w-3xl mx-auto rounded-3xl overflow-hidden shadow-lg aspect-video">
  <iframe
    src="https://www.youtube.com/embed/Xe0FrGzlcVM"
    title="PocketHost Demo"
    class="w-full h-full"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen
  ></iframe>
</div>

<div class="flex flex-col items-center gap-10 mb-20 px-4">
  <h2 class="text-4xl font-semibold text-center text-white">Powerful Features</h2>
  <Features />
</div>

<Testimonials />
