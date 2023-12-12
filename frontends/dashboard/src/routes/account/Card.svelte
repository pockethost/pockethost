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
  <div class="card w-96 {active ? `bg-neutral` : 'bg-base-100'} shadow-xl">
    <div class="card-body">
      <h2 class="card-title">
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
          <div class="text-success text-center text-2xl">
            This is your current plan.
          </div>
          <p class="mt-10 text-neutral-content">
            To change to a different plan, contact <a
              class="link"
              href={`"${DISCORD_URL}"`}>@noaxis on Discord</a
            >
          </p>
        {:else if prices.length > 0}
          <div class="card-actions justify-center">
            {#each prices as price}
              {#if (startLimit > 0 && limit === 0) || !upgradable}
                <button class="btn btn-primary" disabled>{price.title}</button>
              {:else}
                <a class="btn btn-primary" href={price.link} target="_blank"
                  >{price.title}</a
                >
              {/if}
            {/each}
          </div>
          {#if !upgradable}
            To change to this plan, contact @noaxis on <a
              href={`"${DISCORD_URL}"`}>Discord</a
            >
          {/if}
        {/if}
      </div>
    </div>
  </div>
</div>
