<script lang="ts">
  import { DISCORD_URL } from '$src/env'
  import Check from './Check.svelte'

  export let name = 'Plan Name'
  export let active = false
  export let features: string[] = []
  export let upgradable = false
  export let startLimit = 0
  export let limit = 0
  export let prices: { title: string; link: string }[] = []
</script>

<div class="m-10 inline-block">
  <wa-card class="w-96 {active ? 'bg-neutral' : 'bg-neutral-800'} shadow-xl">
    <div class="p-6">
      <h2 class="text-xl font-bold mb-4">
        {name}
      </h2>
      {#if startLimit > 0}
        {#if limit > 0}
          {#if limit != startLimit}
            <div class="text-center text-accent text-2xl">
              <span class="line-through">{startLimit}</span>
              <span class="text-error">{limit} remaining</span>
            </div>
          {:else}
            <div class="text-center text-accent text-2xl">
              {limit} remaining
            </div>
          {/if}
        {:else}
          <div class="text-center text-error text-2xl">SOLD OUT</div>
        {/if}
      {/if}
      <ul>
        {#each features as feature}
          <li><Check /> {feature}</li>
        {/each}
      </ul>

      <slot />

      <div class="mt-10">
        {#if active}
          <div class="text-success text-center text-2xl">This is your current plan.</div>
          <p class="mt-10 text-neutral-content">
            To change to a different plan, contact <a class="text-primary" href={`"${DISCORD_URL}"`}
              ><code>.noaxis</code> on Discord</a
            >
          </p>
        {:else if prices.length > 0}
          <div class="flex justify-center gap-2 flex-wrap">
            {#each prices as price}
              {#if (startLimit > 0 && limit === 0) || !upgradable}
                <wa-button variant="brand" disabled>{price.title}</wa-button>
              {:else}
                <wa-button href={price.link} variant="brand" target="_blank">{price.title}</wa-button>
              {/if}
            {/each}
          </div>
          {#if !upgradable}
            To change to this plan, <a href="/support" class="text-primary">contact support</a>
          {/if}
        {/if}
      </div>
    </div>
  </wa-card>
</div>
