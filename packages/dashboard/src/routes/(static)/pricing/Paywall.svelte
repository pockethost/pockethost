<script lang="ts">
  import Testimonials from '$src/components/Testimonials.svelte'
  import Features from './Features.svelte'
  import { INSTANCE_ANNUAL_PV_ID, INSTANCE_LIFETIME_PV_ID, INSTANCE_MONTHLY_PV_ID } from '@pockethost/server/common'
  import SignupBox from './SignupBox.svelte'

  const MONTHLY_PRICE = 9.99
  const ANNUAL_PRICE = 59.99
  const monthlyYearTotal = MONTHLY_PRICE * 12
  const annualSavings = Math.round((monthlyYearTotal - ANNUAL_PRICE) * 100) / 100
  const annualSavingsPercent = Math.round((annualSavings / monthlyYearTotal) * 100)

  const slotStorage = `10 GB disk storage per instance (files in your own S3 don't count)`
  const trialFeature = '30-day money-back guarantee'
  const slotFeatures = [
    slotStorage,
    'Storage adds to your account pool, shared across every PocketBase you run',
    'Cloudflare CDN and DDoS protection',
    'Unmetered bandwidth and CPU (fair use)',
    'Deploy from CI or the CLI, plus SFTP file access',
  ]
  const monthlyFeatures = [trialFeature, ...slotFeatures]
</script>

<div class="pricing-page-header">
  <h2 class="pricing-page-title">Pricing</h2>
  <p class="pricing-page-lead">Pay Per PocketBase. Pay for each instance you run.</p>
</div>

<div class="pricing-page-grid">
  <SignupBox
    pvId={INSTANCE_MONTHLY_PV_ID}
    title="Monthly"
    price="$9.99"
    priceDetail="per instance, per month"
    priceNote={`$${(MONTHLY_PRICE / 6).toFixed(2)}/mo per instance after year 1, with 5 bonus instances`}
    cta="Each instance includes 10 GB disk storage. Need more? Add another instance."
    features={monthlyFeatures}
  />
  <SignupBox
    pvId={INSTANCE_ANNUAL_PV_ID}
    selected
    savingsPercent={annualSavingsPercent}
    savingsAmountLabel={`Save $${annualSavings.toFixed(0)} per instance vs monthly billing`}
    compareAtPrice={`$${monthlyYearTotal.toFixed(2)}/yr`}
    title="Annual"
    price="$59.99"
    priceDetail="per instance, per year"
    priceNote={`$${(ANNUAL_PRICE / 6 / 12).toFixed(2)}/mo per instance from day one, with 5 bonus instances`}
    cta="Everything in Monthly, billed once a year, plus:"
    features={[
      '5 bonus instances from day one: 6 instances for the price of 1',
      'One payment a year, no monthly charges',
    ]}
  />
  <SignupBox
    pvId={INSTANCE_LIFETIME_PV_ID}
    buttonText="Buy lifetime instance"
    price="$149.99"
    priceDetail="once per instance"
    title="Lifetime"
    cta="Everything in Monthly, paid once, plus:"
    features={[
      '5 bonus instances from day one: 6 instances for the price of 1',
      'Lifetime hosting for each instance you buy',
      'No renewals and no recurring fees',
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
