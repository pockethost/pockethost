<script lang="ts">
  import { userStore } from '$util/stores'
  import { onMount, onDestroy } from 'svelte'
  export let name = ''
  export let description = ''
  export let priceMonthly: [number, string?, number?] = [0, '']
  export let priceAnnually: [number, string?, number?] = [0, '']
  export let checkoutMonthURL = ''
  export let checkoutYearURL = ''
  export let qtyMax = 0
  export let qtyRemaining = 0
  export let soldOutText = 'SOLD OUT'
  export let comingSoonText = 'COMING SOON'
  export let availableText = 'AVAILABLE'
  export let features: string[] = []
  export let fundingGoals: string[] = []
  export let startDate: Date | null = null
  export let endDate: Date | null = null
  export let requireAuthenticatedUser = false

  const comingSoon = startDate && startDate > new Date()

  let countdown = ''
  let countdownInterval: ReturnType<typeof setInterval>

  function updateCountdown(date: Date | null) {
    if (!date) return

    const now = new Date()
    const difference = date.getTime() - now.getTime()

    if (difference <= 0) {
      countdown = ''
      clearInterval(countdownInterval)
      return
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24))
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((difference % (1000 * 60)) / 1000)

    countdown = `${days}d ${hours}h ${minutes}m ${seconds}s`
  }

  onMount(() => {
    if (!startDate && !endDate) return
    const _update = () => {
      if (startDate && comingSoon) {
        updateCountdown(startDate)
      }
      if (endDate && !comingSoon) {
        updateCountdown(endDate)
      }
    }
    countdownInterval = setInterval(_update, 1000)
    _update()
  })

  onDestroy(() => {
    if (countdownInterval) clearInterval(countdownInterval)
  })

  function handlePricingClick(event: MouseEvent) {
    if (comingSoon) {
      event.preventDefault()
      alert(comingSoonText)
    } else if (qtyRemaining <= 0) {
      event.preventDefault()
      alert(soldOutText)
    } else if (requireAuthenticatedUser && !$userStore?.verified) {
      event.preventDefault()
      alert('Please create and verify your account first.')
    }
  }
</script>

<wa-card class="w-96 shadow-xl bg-neutral text-neutral-content">
  <div class="p-6 items-center text-center">
    <h2 id="tier-startup" class="text-2xl font-semibold leading-8 text-white mb-4">
      {name}
    </h2>

    {#if qtyRemaining <= 0}
      <div class="text-error text-xl font-black text-center">{soldOutText}</div>
    {:else if startDate || endDate}
      <div class="text-center">
        <div class="flex items-center justify-center">
          <wa-icon name="clock" class="mr-2 text-accent"></wa-icon>
          <span class="text-lg font-semibold text-accent"
            >{comingSoon ? comingSoonText : availableText} {countdown}</span
          >
        </div>
      </div>
    {:else}
      <div class="text-accent text-xl font-black text-center">
        {availableText}
      </div>
    {/if}

    {#if qtyMax > 0}
      <div
        class="w-full animate-text bg-gradient-to-r from-teal-500 via-purple-500 to-orange-500 bg-clip-text text-transparent text-xl font-black"
      >
        <div>
          {qtyRemaining} remaining
        </div>
      </div>
    {/if}

    <div class="mt-4 mb-4 leading-6 text-gray-300 text-left">{description}</div>

    <div class="flex flex-col gap-y-2 mb-4">
      {#each features as feature}
        <div class="text-gray-300 flex items-center text-sm">
          {#if feature.startsWith('-')}
            <wa-icon name="xmark" class="text-error mr-2"></wa-icon>
          {:else}
            <wa-icon name="check" class="text-primary mr-2"></wa-icon>
          {/if}
          <span>{feature.replace(/^-/, '')}</span>
        </div>
      {/each}
    </div>

    {#if fundingGoals.length > 0}
      <div class="flex flex-col gap-y-2 mb-4">
        <div>Feature Goals</div>
        <div class="text-sm text-left">
          When {name} sell out, we'll use the funds to achieve these goals.
        </div>
        {#each fundingGoals as goal}
          <div class="text-gray-300 flex items-center text-sm space-x-2">
            <span class="text-primary">▢</span>
            <span>{goal}</span>
          </div>
        {/each}
      </div>
    {/if}

    <div class="flex flex-col gap-2">
      {#if priceAnnually[0] > 0}
        <wa-button
          href={comingSoon ? undefined : checkoutYearURL}
          variant="neutral"
          class="w-full"
          disabled={qtyRemaining <= 0}
          onclick={handlePricingClick}
        >
          {#if priceAnnually[2]}
            <span class="text-xl font-bold tracking-tight {qtyRemaining <= 0 ? 'text-gray-700' : 'text-gray-400'} line-through">
              ${priceAnnually[0]}
            </span>
            <span class="text-xl font-bold tracking-tight">${priceAnnually[2]}</span>
          {:else}
            <span class="text-xl font-bold tracking-tight">${priceAnnually[0]}</span>
          {/if}
          <span class="text-sm font-semibold leading-6 {qtyRemaining <= 0 ? 'text-gray-600' : 'text-gray-300'}">
            / {priceAnnually[1]}
          </span>
        </wa-button>
      {/if}
      {#if priceMonthly[0] > 0}
        <wa-button
          href={comingSoon ? undefined : checkoutMonthURL}
          variant="neutral"
          class="w-full"
          disabled={qtyRemaining <= 0}
          onclick={handlePricingClick}
        >
          {#if priceMonthly[2]}
            <span class="text-xl font-bold tracking-tight {qtyRemaining <= 0 ? 'text-gray-700' : 'text-gray-400'} line-through">
              ${priceMonthly[0]}
            </span>
            <span class="text-xl font-bold tracking-tight">${priceMonthly[2]}</span>
          {:else}
            <span class="text-xl font-bold tracking-tight">${priceMonthly[0]}</span>
          {/if}
          <span class="text-sm font-semibold leading-6 {qtyRemaining <= 0 ? 'text-gray-600' : 'text-gray-300'}">
            / {priceMonthly[1]}
          </span>
        </wa-button>
      {/if}
    </div>
  </div>
</wa-card>
