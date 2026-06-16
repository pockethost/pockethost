<script lang="ts">
  import { userStore, isUserLoggedIn } from '$util/stores'
  import { FLOUNDER_CHECKOUT_VARIANT_ID, lemonsqueezyCheckoutUrl } from '$util/lemonsqueezy'

  export let selected: boolean = false
  export let buttonText: string = 'Subscribe Now'
  export let price: string
  export let priceDetail: string = ''
  export let bestDeal: boolean = false
  export let title: string
  export let cta: string
  export let features: string[]

  $: checkoutUrl =
    $isUserLoggedIn && $userStore?.id && $userStore?.email
      ? lemonsqueezyCheckoutUrl(FLOUNDER_CHECKOUT_VARIANT_ID, $userStore.id, $userStore.email)
      : null
</script>

<div class="pricing-plan {selected ? 'pricing-plan--featured' : ''}">
  {#if bestDeal}
    <div class="pricing-plan-badge">HOT</div>
  {/if}

  <div class="pricing-plan-header">
    <h3 class="pricing-plan-title">{title}</h3>
    <p class="pricing-plan-lead">{cta}</p>
  </div>

  <ul class="pricing-plan-features">
    {#each features as feature}
      <li class="pricing-plan-feature">
        <wa-icon
          name={feature.startsWith('-') ? 'xmark' : 'check'}
          class={feature.startsWith('-') ? 'pricing-plan-feature-icon--no' : 'pricing-plan-feature-icon--ok'}
        ></wa-icon>
        <span class={feature.startsWith('-') ? 'pricing-plan-feature--struck' : ''}>
          {feature.replace('-', '')}
        </span>
      </li>
    {/each}
  </ul>

  <div class="pricing-plan-price-block">
    <div class="pricing-plan-price">{price}</div>
    {#if priceDetail}
      <div class="pricing-plan-price-detail">{priceDetail}</div>
    {/if}
  </div>

  <div class="pricing-plan-cta-wrap">
    {#if checkoutUrl}
      <a href={checkoutUrl} class="pricing-plan-cta {selected ? 'pricing-plan-cta--featured wiggle' : ''}">
        {buttonText}
      </a>
    {:else}
      <button
        type="button"
        class="pricing-plan-cta {selected ? 'pricing-plan-cta--featured wiggle' : ''}"
        onclick={() => alert('You must be logged in to subscribe')}
      >
        {buttonText}
      </button>
    {/if}
  </div>
</div>
