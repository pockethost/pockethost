<script lang="ts">
  import { goto } from '$app/navigation'
  import { isUserLoggedIn } from '$util/stores'
  import { checkoutIntentUrl } from '$util/checkoutIntent'
  import { createLemonSqueezyCheckout } from '$util/lemonsqueezy'

  export let pvId: string
  export let selected: boolean = false
  export let buttonText: string = 'Subscribe Now'
  export let price: string
  export let priceDetail: string = ''
  export let bestDeal: boolean = false
  export let badgeText: string | undefined = undefined
  export let badgeUrgent: boolean = false
  /** Large in-card savings callout (e.g. annual vs monthly). */
  export let savingsPercent: number | undefined = undefined
  export let savingsAmountLabel: string | undefined = undefined
  export let compareAtPrice: string | undefined = undefined
  export let title: string | undefined = undefined
  export let cta: string
  export let features: string[]

  let loading = false
  let checkoutError = ''

  $: loggedOutButtonText = buttonText === 'Subscribe Now' ? 'Create account & subscribe' : buttonText
  $: ctaButtonLabel = $isUserLoggedIn ? buttonText : loggedOutButtonText

  const startCheckout = async () => {
    checkoutError = ''

    if (!$isUserLoggedIn) {
      await goto(checkoutIntentUrl(pvId))
      return
    }

    if (loading) return

    loading = true
    try {
      const url = await createLemonSqueezyCheckout(pvId)
      window.location.href = url
    } catch (err) {
      console.error(err)
      checkoutError = err instanceof Error ? err.message : 'Could not start checkout. Please try again.'
    } finally {
      loading = false
    }
  }
</script>

<div class="pricing-plan {selected ? 'pricing-plan--featured' : ''} {savingsPercent ? 'pricing-plan--splasher' : ''}">
  {#if badgeText}
    <div class="pricing-plan-badge" class:pricing-plan-badge--urgent={badgeUrgent}>{badgeText}</div>
  {:else if savingsPercent}
    <div class="pricing-plan-badge pricing-plan-badge--savings">Save {savingsPercent}%</div>
  {:else if bestDeal}
    <div class="pricing-plan-badge">HOT</div>
  {/if}

  <div class="pricing-plan-header">
    {#if title}
      <h3 class="pricing-plan-title">{title}</h3>
    {/if}
    {#if savingsPercent}
      <div class="pricing-plan-splasher" aria-label="Save {savingsPercent} percent vs monthly billing">
        <span class="pricing-plan-splasher-percent">{savingsPercent}%</span>
        <span class="pricing-plan-splasher-off">OFF</span>
        {#if savingsAmountLabel}
          <span class="pricing-plan-splasher-detail">{savingsAmountLabel}</span>
        {/if}
      </div>
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
    {#if compareAtPrice}
      <div class="pricing-plan-compare-at">{compareAtPrice}</div>
    {/if}
    <div class="pricing-plan-price">{price}</div>
    {#if priceDetail}
      <div class="pricing-plan-price-detail">{priceDetail}</div>
    {/if}
  </div>

  {#if checkoutError}
    <wa-callout variant="danger" class="wa-callout-padded pricing-plan-error">
      <wa-icon slot="icon" name="circle-xmark"></wa-icon>
      {checkoutError}
    </wa-callout>
  {/if}

  <div class="pricing-plan-cta-wrap">
    <button
      type="button"
      class="pricing-plan-cta {selected ? 'pricing-plan-cta--featured wiggle' : ''}"
      disabled={loading}
      onclick={startCheckout}
    >
      {loading ? 'Loading…' : ctaButtonLabel}
    </button>
  </div>
</div>
