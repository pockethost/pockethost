<script lang="ts">
  import Testimonials from '$src/components/Testimonials.svelte'
  import Features from './Features.svelte'
  import {
    DB_STORAGE_MB_PER_INSTANCE,
    FILE_STORAGE_GB_PER_INSTANCE,
    INSTANCE_ANNUAL_PV_ID,
    INSTANCE_LIFETIME_PV_ID,
    INSTANCE_MONTHLY_PV_ID,
  } from 'pockethost/common'
  import SignupBox from './SignupBox.svelte'

  const MONTHLY_PRICE = 9.99
  const ANNUAL_PRICE = 59.99
  const monthlyYearTotal = MONTHLY_PRICE * 12
  const annualSavings = Math.round((monthlyYearTotal - ANNUAL_PRICE) * 100) / 100
  const annualSavingsPercent = Math.round((annualSavings / monthlyYearTotal) * 100)

  const slotStorage = `${DB_STORAGE_MB_PER_INSTANCE} MB DB data storage + ${FILE_STORAGE_GB_PER_INSTANCE} GB file storage per PocketBase`
  const sharedFeatures = [
    slotStorage,
    'Storage adds to your account pool, shared across every PocketBase you run',
    'Global Fly ingress, private network routing',
    'Unmetered bandwidth and CPU (fair use)',
    'SFTP file access',
  ]
</script>

<div class="pricing-page-header">
  <h2 class="pricing-page-title">Pricing</h2>
  <p class="pricing-page-lead">Pay Per PocketBase. One slot powers on one PocketBase at a time.</p>
</div>

<div class="pricing-page-grid">
  <SignupBox
    pvId={INSTANCE_MONTHLY_PV_ID}
    title="Monthly"
    price="$9.99"
    priceDetail="per PocketBase, per month"
    cta="Each slot includes {DB_STORAGE_MB_PER_INSTANCE} MB DB data storage and {FILE_STORAGE_GB_PER_INSTANCE} GB file storage. Add another PocketBase, add another slot."
    features={['7 day risk-free trial', ...sharedFeatures]}
  />
  <SignupBox
    pvId={INSTANCE_ANNUAL_PV_ID}
    selected
    savingsPercent={annualSavingsPercent}
    savingsAmountLabel={`Save $${annualSavings.toFixed(0)} per slot vs monthly billing`}
    compareAtPrice={`$${monthlyYearTotal.toFixed(2)}/yr`}
    title="Annual"
    price="$59.99"
    priceDetail="per PocketBase, per year"
    cta="Same slot entitlements as monthly. Billed once per year."
    features={[`Effective $${(ANNUAL_PRICE / 12).toFixed(2)}/mo when paid annually`, ...sharedFeatures]}
  />
  <SignupBox
    pvId={INSTANCE_LIFETIME_PV_ID}
    buttonText="Buy lifetime slot"
    price="$149.99"
    priceDetail="once per PocketBase"
    title="Lifetime"
    cta="Pay once per slot for lifetime Pay Per PocketBase hosting. No recurring fees."
    features={['Lifetime access per slot purchased', 'No recurring fees', ...sharedFeatures]}
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
