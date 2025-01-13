<script lang="ts">
  import Testimonials from '$src/components/Testimonials.svelte'
  import Features from './Features.svelte'
  import SignupBox from './SignupBox.svelte'
  import { userStore } from '$util/stores'
</script>

<div class="prose ml-auto mr-auto">
  <p class="text-3xl text-center text-white">Affordable Hosting</p>
  <p class="text-xl text-center">Premium Performance</p>
  <div class="flex flex-row justify-center mt-10 mb-10 gap-3">
    <div class="btn btn-neutral btn-xs rounded-xl">Open Source</div>
    <div class="btn btn-neutral btn-xs rounded-xl">No Limits</div>
    <div class="btn btn-neutral btn-xs rounded-xl">Priority Support</div>
  </div>
</div>

<div
  class="grid grid-cols-1 md:grid-cols-3 justify-items-center gap-1 mb-10 mx-auto"
>
  <SignupBox
    price="$5 / month"
    title="Starter"
    cta="Pay just $5 per instance for up to 5 instances, get access to all features."
    features={[
      '7 day risk-free trial',
      '35+ regions',
      'Unlimited bandwidth, storage, and CPU',
      'FTP Access',
      'Priority support',
    ]}
  />
  <SignupBox
    selected
    price="$25 / month"
    bestDeal
    title="Unlimited"
    cta="Pay just $25 monthly to get access to all features with unlimited instances! "
    features={['Everything in the Starter plan', 'Unlimited instances']}
  />
  <SignupBox
    buttonText="Become a Flounder"
    price="$359 once"
    title="Flounder - Lifetime"
    cta="The lifetime deal won't last long, so get it while you can!"
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

<div
  class="flex justify-center mb-10 bg-neutral rounded-2xl p-10 w-min mx-auto"
>
  <iframe
    width="560"
    height="315"
    src="https://www.youtube.com/embed/Xe0FrGzlcVM?si=XTJJ7pmp9cwjBOMY"
    title="YouTube video player"
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    referrerpolicy="strict-origin-when-cross-origin"
    allowfullscreen
  ></iframe>
</div>

<div class="flex flex-col gap-10 items-center">
  <div class="text-3xl text-center pb-5">Features</div>

  <Features />
</div>

<Testimonials />
