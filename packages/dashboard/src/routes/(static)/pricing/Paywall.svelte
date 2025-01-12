<script lang="ts">
  import Card from './Card.svelte'
  import Testimonials from '$src/components/Testimonials.svelte'
  import CtaButton from './CTAButton.svelte'
  import { features } from './features'
  import Deals from './Deals.svelte'
  import Features from './Features.svelte'
</script>

<div class="prose ml-auto mr-auto">
  <p class="text-3xl text-center">PocketHost Access</p>
  <p class="text-2xl text-center">
    <span class="text-primary">$5/instance</span> or
    <span class="text-primary">$25/unlimited</span>
  </p>
  <p class="text-xl text-accent text-center">7 Day Free Trial</p>
  <div class="flex justify-center mt-10 mb-10">
    <CtaButton />
  </div>
</div>

<div class="flex justify-center mb-10">
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
  <Features />
</div>

<Deals />

<Testimonials />

<CtaButton fixed />
