<script lang="ts">
  import Card from './Card.svelte'
  import regions from './regions.png?enhanced'
  import Testimonials from '$src/components/Testimonials.svelte'
  import { userStore } from '$src/util/stores'

  let idx = 0
  const features = [
    {
      title: 'PocketBase at Global Scale',
      img: regions,
      description:
        'PocketHost has edges in 40+ regions. Your users connect through our global network of edge servers, then our internal VPN handles world-class routing to your data, wherever it resides.',
      button: 'Unlock Access Now',
    },
    {
      title: 'Developer-Friendly Pricing',
      description: `Join the pirate ship for just $5 per instance. After 5 instances? It's on us, because we like how you think.`,
      button: 'Unlock Access Now',
    },
    {
      title: 'Risk-free Trial',
      description: `Test-drive PocketHost for 7 days. Credit card required.`,
      button: 'Unlock Access Now',
    },
    {
      title: 'Pay Once, Use Forever',
      description: `Join the Flounder's crew LTD. One payment, lifetime access to the Pro tier (up to 250 instances). Once these spots are gone, they're gone forever.`,
      button: 'Unlock Access Now',
    },
    {
      title: 'No Usage Police',
      description: `Forget usage meters and quotas. Our Fair Use policy means you can build without limits. Gone viral? We've got your back. No questions asked.`,
      button: 'Unlock Access Now',
    },
    {
      title: 'Ludicrous Speed',
      description: `Our global network moves at the speed of thought. 10-30ms average time-to-edge means your apps feel like magic. Your users won't know what hit them.`,
      button: 'Unlock Access Now',
    },
    {
      title: 'Early Access to New Tech',
      description: `Get your hands on our experimental <a href="/blog/announcing-pocker" class="link">Pocker</a> tech before anyone else. Help us push the boundaries of what's possible.`,
      button: 'Unlock Access Now',
    },
    {
      title: 'Unshakeable',
      description:
        'With 99.95% uptime, your apps stay up while others go down. Sleep easy knowing your creation is always ready to serve.',
      button: 'Unlock Access Now',
    },
    {
      title: 'Death to DevOps',
      description: `Focus on the cool stuff. Let us handle the boring bits - scaling, backups, maintenance. It's time to build something legendary.`,
      button: 'Unlock Access Now',
    },
    {
      title: 'Hack More, Pay Less',
      description:
        'Why waste time managing servers? Put your resources into building the next big thing. Your wallet (and your future app) will thank you.',
      button: 'Unlock Access Now',
    },
    {
      title: 'Power to the Builders',
      description:
        'Join us in building the future. Every subscription supports the creators and contributors of the 100% open-source PocketBase and PocketHost projects.',
      button: 'Unlock Access Now',
    },
  ]

  $: feature = features[idx]!
</script>

<div class="prose ml-auto mr-auto">
  <p class="text-3xl text-center">PocketHost Access</p>
  <p class="text-2xl text-center">
    <span class="text-primary">$5/instance</span> or
    <span class="text-primary">$25/unlimited</span>
  </p>
  <p class="text-xl text-accent text-center">7 Day Free Trial</p>
  <div class="flex justify-center mt-10 mb-10">
    <a
      class="btn btn-warning btn-lg"
      style="z-index: 1000"
      href={`https://store.pockethost.io/buy/d4b2d062-429c-49b4-9cdc-853aaeb17e20?checkout[custom][user_id]=${$userStore?.id}&checkout[email]=${$userStore?.email}`}
      >{feature.button}</a
    >
  </div>

  {#each features as feature}
    <div class="not-prose mb-10">
      <Card {feature} />
    </div>
  {/each}

  <Testimonials />
</div>
<a
  class="btn btn-warning btn-block btn-lg rounded-none fixed bottom-0"
  style="z-index: 1000"
  href={`https://store.pockethost.io/buy/d4b2d062-429c-49b4-9cdc-853aaeb17e20?checkout[custom][user_id]=${$userStore?.id}&checkout[email]=${$userStore?.email}`}
  >{feature.button}</a
>
