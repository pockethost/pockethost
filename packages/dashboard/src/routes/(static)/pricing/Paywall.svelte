<script lang="ts">
  import Testimonials from '$src/components/Testimonials.svelte'
  import PricingPlans from '$src/components/PricingPlans.svelte'
  import Features from './Features.svelte'
</script>

<div class="pricing-page-header">
  <h2 class="pricing-page-title">Pricing</h2>
  <p class="pricing-page-lead">Pay per instance. Every plan has a 30-day money-back guarantee.</p>
  <p class="pricing-page-sublead">Each paid instance adds 10 GB to your account's shared storage.</p>
</div>

<PricingPlans />

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
