<script lang="ts">
  /** The three plan cards and the bonus footnote. Used on /pricing, the home page and the unpaid dashboard. */
  import { INSTANCE_ANNUAL_PV_ID, INSTANCE_LIFETIME_PV_ID, INSTANCE_MONTHLY_PV_ID } from '@pockethost/server/common'
  import SignupBox from '$src/routes/(static)/pricing/SignupBox.svelte'

  const MONTHLY_PRICE = 9.99
  const ANNUAL_PRICE = 59.99
  const monthlyYearTotal = MONTHLY_PRICE * 12
  const annualSavings = Math.round((monthlyYearTotal - ANNUAL_PRICE) * 100) / 100
  const annualSavingsPercent = Math.round((annualSavings / monthlyYearTotal) * 100)

  const LIFETIME_PRICE = 149.99
  const withBonus = (price: number) => (price / 6).toFixed(2)

  const monthlyFeatures = [
    '10 GB storage per paid instance',
    'Cloudflare CDN and DDoS protection',
    'Unmetered bandwidth and CPU (fair use)',
    'Deploy from CI or the CLI',
  ]
</script>

<div class="pricing-page-grid">
  <SignupBox
    pvId={INSTANCE_MONTHLY_PV_ID}
    title="Monthly"
    highlightBig="+5"
    highlightWord="BONUS"
    highlightDetail="Earn up to 5 loyalty bonus instances"
    buttonText="Start monthly"
    price="$9.99"
    priceDetail="per instance, per month"
    priceNote={`As low as $${withBonus(MONTHLY_PRICE)}/mo per instance with 5 bonus instances`}
    cta="Billed every month."
    features={monthlyFeatures}
  />
  <SignupBox
    pvId={INSTANCE_ANNUAL_PV_ID}
    selected
    glow
    highlightBig={`${annualSavingsPercent}%`}
    highlightWord="OFF"
    highlightDetail={`Save $${annualSavings.toFixed(0)} per instance vs monthly`}
    compareAtPrice={`$${monthlyYearTotal.toFixed(2)}/yr`}
    title="Annual"
    buttonText="Start annual"
    price="$59.99"
    priceDetail="per instance, per year"
    priceNote={`$${withBonus(ANNUAL_PRICE / 12)}/mo per instance with 5 bonus instances`}
    cta="Everything in Monthly, billed once a year."
    features={['5 loyalty bonus instances right away', 'One payment a year']}
  />
  <SignupBox
    pvId={INSTANCE_LIFETIME_PV_ID}
    buttonText="Buy lifetime"
    price="$149.99"
    priceDetail="once, per instance"
    priceNote={`$${Math.round(LIFETIME_PRICE / 6)} per instance with 5 bonus instances`}
    title="Lifetime"
    cta="Everything in Monthly, paid once."
    features={['5 loyalty bonus instances right away', 'No renewals or recurring fees']}
  />
</div>

<p class="pricing-footnote">
  Bonus instances are a loyalty perk. They add no storage and count only while you have a paid instance. See the
  <a href="/terms">Terms of Service</a>.
</p>
