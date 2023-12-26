<script lang="ts">
  import { client } from '$src/pocketbase-client'
  import { isString } from '@s-libs/micro-dash'
  import { onMount } from 'svelte'
  import { writable } from 'svelte/store'

  type Plan = {
    slug: keyof Plans
    name: string
    prices: { title: string; url: string }[]
    featured?: boolean
    startLimit?: number
    limit?: number
    description: string
  }

  type Plans = {
    all: string
    founder: string
    pro: string
    free: string
    legacy: string
  }

  const features: {
    title: string
    planMap: { [k in keyof Plans]?: string | boolean }
  }[] = [
    {
      title: '# Projects',
      planMap: {
        all: `Unlimited`,
        free: `1`,
        legacy: `However many you have right now`,
      },
    },
    { title: 'Unlimited Bandwidth*', planMap: { all: true } },
    { title: 'Unlimited Storage*', planMap: { all: true } },
    { title: 'Unlimited CPU*', planMap: { all: true } },
    { title: `FTP access`, planMap: { all: true } },
    { title: `Run every version of PocketBase`, planMap: { all: true } },
    { title: `Community Discord`, planMap: { all: true } },
    { title: `Priority Discord`, planMap: { pro: true, founder: true } },
    { title: `Founder's Discord`, planMap: { founder: true } },
    { title: `Founders mug/tee`, planMap: { founder: true } },
  ]

  const founderMembershipsRemaining = writable(0)

  onMount(async () => {
    console.log(`mount`)
    try {
      const membershipCount = await client()
        .client.collection('settings')
        .getFirstListItem(`name = 'founders-edition-count'`)
      founderMembershipsRemaining.set(membershipCount.value)
    } catch (e) {
      console.error(e)
    }
  })

  let plans: Plan[] = []

  $: {
    plans = [
      {
        slug: 'free',
        name: 'Hacker',
        prices: [],
        description: `Free forever. Use PocketHost for your next project and enjoy all the same features the paid tiers get.`,
      },
      {
        slug: 'pro',
        name: 'Pro',
        prices: [
          { title: `$20/mo`, url: `https://buy.stripe.com/fZe6sd8Mkfc30Kc4gg` },
          {
            title: `$199/yr (save 20%)`,
            url: `https://buy.stripe.com/bIYeYJbYwd3VdwY289`,
          },
        ],
        description: `Want all your PocketHost projects in one place? That's what the Pro tier is all about.`,
      },

      {
        slug: 'founder',
        name: `🎉 🎈 Founder's Edition 🎊 🍄`,
        prices: [
          {
            title: `$299 once, use forever`,
            url: `https://buy.stripe.com/7sIg2N6Ecgg70KcdQT`,
          },
          {
            title: `$99/yr (save 50%)`,
            url: `https://buy.stripe.com/aEUdUF7Igfc350s28a`,
          },
        ],
        featured: true,
        startLimit: 100,
        limit: $founderMembershipsRemaining,
        description: `Super elite! The Founder's Edition is our way of saying thanks for supporting PocketHost in these early days. Choose between lifetime and annual options.`,
      },
    ]
  }
</script>

<div class="container mx-auto p-4">
  <table class="table table-lg">
    <thead>
      <tr>
        <th></th>
        {#each plans as plan}
          <th class="align-top {plan.featured ? 'bg-neutral' : ''}">
            <div class="text-xl text-center">{plan.name}</div>
            {#each plan.prices as { title, url }}
              <div class="text-center">
                <a
                  class="btn-wide btn btn-primary btn-xs text-xs text-block m-1"
                  href={url}
                  target="_blank">{title}</a
                >
              </div>
            {/each}
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      <tr class="hover">
        <td></td>
        {#each plans as plan}
          <td
            class="text-sm align-top text-info {plan.featured
              ? 'bg-neutral'
              : ''}"
          >
            {plan.description}
          </td>
        {/each}
      </tr>
      <tr class="hover">
        <td></td>
        {#each plans as plan}
          <td
            class="text-sm align-top text-info {plan.featured
              ? 'bg-neutral'
              : ''}"
          >
            <div>
              {#if plan.startLimit || 0 > 0}
                {#if plan.limit || 0 > 0}
                  {#if plan.limit != plan.startLimit}
                    <div class="text-center text-accent text-2xl">
                      <span class="line-through">{plan.startLimit}</span>
                      <span class="text-error">{plan.limit} remaining</span>
                    </div>
                  {:else}
                    <div class="text-center text-accent text-2xl">
                      {plan.limit} remaining
                    </div>
                  {/if}
                {:else}
                  <div class="text-center text-error text-2xl">SOLD OUT</div>
                {/if}
              {/if}
            </div>
          </td>
        {/each}
      </tr>
      {#each features as { title, planMap }, i}
        <tr class="hover">
          <td>{title}</td>
          {#each plans as plan}
            <td class={plan.featured ? 'bg-neutral' : ''}>
              {#if planMap[plan.slug] || planMap.all}
                {#if isString(planMap[plan.slug])}
                  {planMap[plan.slug]}
                {:else if isString(planMap.all)}
                  {planMap.all}
                {:else}
                  <i class="text-success fa-solid fa-check"></i>
                {/if}
              {:else}
                <i class="text-error fa-solid fa-x"></i>
              {/if}
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>
