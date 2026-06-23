<script lang="ts">
  import { isUserLoggedIn } from '$util/stores'
  import { createLemonSqueezyCheckout } from '$util/lemonsqueezy'

  export let pvId: string
  export let selected: boolean = false
  export let buttonText: string = 'Subscribe Now'
  export let price: string
  export let priceDetail: string = ''
  export let bestDeal: boolean = false
  export let badgeText: string | undefined = undefined
  export let badgeUrgent: boolean = false
  export let title: string | undefined = undefined
  export let cta: string
  export let features: string[]

  let loading = false

  const startCheckout = async () => {
    if (!$isUserLoggedIn) {
      alert('You must be logged in to subscribe')
      return
    }
    if (loading) return

    loading = true
    try {
      const url = await createLemonSqueezyCheckout(pvId)
      window.location.href = url
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Could not start checkout. Please try again.')
    } finally {
      loading = false
    }
  }
</script>

<div class="pricing-plan {selected ? 'pricing-plan--featured' : ''}">
  {#if badgeText}
    <div class="pricing-plan-badge" class:pricing-plan-badge--urgent={badgeUrgent}>{badgeText}</div>
  {:else if bestDeal}
    <div class="pricing-plan-badge">HOT</div>
  {/if}

  <div class="pricing-plan-header">
    {#if title}
      <h3 class="pricing-plan-title">{title}</h3>
    {/if}
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
    <button
      type="button"
      class="pricing-plan-cta {selected ? 'pricing-plan-cta--featured wiggle' : ''}"
      disabled={loading}
      onclick={startCheckout}
    >
      {loading ? 'Loading…' : buttonText}
    </button>
  </div>
</div>
