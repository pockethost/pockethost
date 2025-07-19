<script lang="ts">
  import Testimonials from '$src/components/Testimonials.svelte'
  import Fa from 'svelte-fa'
  import Features from './Features.svelte'
  import SignupBox from './SignupBox.svelte'
  import { faPlay } from '@fortawesome/free-solid-svg-icons'
  import thumb from './011.jpg?enhanced'
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

<div class="grid grid-cols-1 md:grid-cols-3 justify-items-center gap-1 mx-auto">
  <SignupBox
    price="$5 / month"
    priceDetail="per instance"
    title="Starter"
    cta="Pay $5 per instance, up to a maximum of 5 instances. Each extra instance costs an additional $5"
    features={[
      'Access to all features',
      '7 day risk-free trial',
      '35+ regions',
      'Unlimited bandwidth, storage, and CPU',
      'FTP Access',
      'Priority support',
      'Flexible - only pay for as many as you need',
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

<div class="relative flex flex-col items-center mb-10 p-2 bg-neutral rounded-2xl w-fit mx-auto max-w-96">
  <a
    href="https://www.youtube.com/watch?v=Xe0FrGzlcVM"
    target="_blank"
    class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-neutral rounded-2xl p-5"
  >
    <Fa icon={faPlay} class="text-white text-4xl" />
  </a>
  <a href="https://www.youtube.com/watch?v=Xe0FrGzlcVM" target="_blank" aria-label="PocketHost Demo">
    <enhanced:img src={thumb} alt="PocketHost Demo" class="rounded" />
  </a>
</div>

<div class="flex flex-col gap-10 items-center mb-10">
  <div class="text-3xl text-center pb-5">Features</div>

  <Features />
</div>

<Testimonials />
