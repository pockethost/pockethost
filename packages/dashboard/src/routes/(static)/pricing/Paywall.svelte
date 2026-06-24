<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import Testimonials from '$src/components/Testimonials.svelte'
  import { daysUntilFlounderSunset, flounderDaysLeftLabel, FLOUNDER_SALES_END_LABEL } from '$util/flounderSunset'
  import Features from './Features.svelte'
  import FlounderCountdown from './FlounderCountdown.svelte'
  import {
    DB_STORAGE_MB_PER_INSTANCE,
    FILE_STORAGE_GB_PER_INSTANCE,
    FLOUNDER_LIFETIME_PV_ID,
    INSTANCE_MONTHLY_PV_ID,
  } from 'pockethost/common'
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
  <h2 class="pricing-page-title">Pricing</h2>
  <FlounderCountdown />
</div>

<div class="pricing-page-grid">
  <SignupBox
    pvId={INSTANCE_MONTHLY_PV_ID}
    selected
    bestDeal
    title="Pay Per PocketBase"
    price="$5"
    priceDetail="per PocketBase, per month"
    cta="Each PocketBase includes {DB_STORAGE_MB_PER_INSTANCE} MB DB data storage and {FILE_STORAGE_GB_PER_INSTANCE} GB file storage. Add another PocketBase, add another $5."
    features={[
      `${DB_STORAGE_MB_PER_INSTANCE} MB DB data storage + ${FILE_STORAGE_GB_PER_INSTANCE} GB file storage per PocketBase`,
      'Storage adds to your account pool — shared across every PocketBase you run',
      '7 day risk-free trial',
      'Global Fly ingress, private network routing',
      'Unmetered bandwidth and CPU (fair use)',
      'SFTP file access',
    ]}
  />
  <SignupBox
    pvId={FLOUNDER_LIFETIME_PV_ID}
    buttonText="Become a Flounder"
    price="$359 once"
    title="Flounder - Lifetime"
    badgeText={flounderBadge}
    badgeUrgent
    cta="Pay once for lifetime Pro hosting. Sales end {FLOUNDER_SALES_END_LABEL}. No new buyers after that date."
    features={[
      'Pay Per PocketBase features, lifetime price',
      'Lifetime access',
      'No recurring fees',
      'Tee shirt',
      '#onlyflounders private Discord',
      '-Girlfriend',
    ]}
  />
</div>

<section class="pricing-below">
  <div class="pricing-demo">
    <p class="pricing-section-eyebrow">Walkthrough</p>
    <h3 class="pricing-section-title">See PocketHost in two minutes</h3>
    <div class="pricing-demo-frame">
      <iframe
        src="https://www.youtube.com/embed/Xe0FrGzlcVM"
        title="PocketHost demo"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      ></iframe>
    </div>
  </div>

  <div class="pricing-included">
    <p class="pricing-section-eyebrow">Included</p>
    <h3 class="pricing-section-title">Everything you need to ship</h3>
    <Features />
  </div>

  <div class="pricing-social-proof">
    <p class="pricing-section-eyebrow">Builders</p>
    <h3 class="pricing-section-title">Trusted by indie hackers</h3>
    <Testimonials />
  </div>
</section>
