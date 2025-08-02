<script lang="ts">
  import Testimonials from '$src/components/Testimonials.svelte'
  import Fa from 'svelte-fa'
  import Features from './Features.svelte'
  import SignupBox from './SignupBox.svelte'
  import { faPlay } from '@fortawesome/free-solid-svg-icons'
  import thumb from './011.jpg?enhanced'
  import BlurBg from '$components/BlurBg.svelte'
</script>

<BlurBg/>
<div class="max-w-7xl mx-auto px-4 pt-8 text-center relative">
  <h2 class="text-4xl font-bold text-white">Affordable Hosting</h2>
  <p class="text-xl text-gray-300 mt-2">Premium Performance</p>

  <!-- <div class="flex flex-wrap justify-center gap-3 mt-6">
    <div class="px-4 py-2 bg-primary/40 text-white text-sm rounded-full">Open Source</div>
    <div class="px-4 py-2 bg-primary/40 text-white text-sm rounded-full">Priority Support</div>
  </div> -->
</div>

<div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto px-4 pt-10 ">
  <SignupBox
    price="$5 / month"
    priceDetail="per instance"
    title="Starter"
    cta="Pay $5 per instance, up to a maximum of 5 instances."
    features={[
      'Access to all features',
      '7 day risk-free trial',
      '35+ regions',
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
  <h2 class="text-4xl font-semibold text-center text-gray-900 dark:text-white">
    Powerful Features
  </h2>
  <Features />
</div>

<Testimonials />
