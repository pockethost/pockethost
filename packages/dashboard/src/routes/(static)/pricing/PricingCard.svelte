<script lang="ts">
  import { faClock, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons'
  import Fa from 'svelte-fa'
  import { onMount, onDestroy } from 'svelte'
  export let name = ''
  export let description = ''
  export let priceMonthly: [number, string?] = [0, '']
  export let priceAnnually: [number, string?] = [0, '']
  export let checkoutMonthURL = ''
  export let checkoutYearURL = ''
  export let qtyMax = 0
  export let qtyRemaining = 0
  export let comingSoon = false
  export let soldOutText = 'SOLD OUT'
  export let comingSoonText = 'COMING SOON'
  export let availableText = 'AVAILABLE'
  export let features: string[] = []
  export let fundingGoals: string[] = []

  const qtySold = qtyMax - qtyRemaining

  let countdown = ''
  let countdownInterval: ReturnType<typeof setInterval>

  function updateCountdown() {
    const now = new Date()
    const blackFriday = new Date(now.getFullYear(), 10, 24) // November is 10 (0-indexed)
    if (now > blackFriday) {
      blackFriday.setFullYear(blackFriday.getFullYear() + 1)
    }

    const difference = blackFriday.getTime() - now.getTime()
    const days = Math.floor(difference / (1000 * 60 * 60 * 24))
    const hours = Math.floor(
      (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    )
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((difference % (1000 * 60)) / 1000)

    countdown = `${days}d ${hours}h ${minutes}m ${seconds}s`
  }

  onMount(() => {
    updateCountdown()
    countdownInterval = setInterval(updateCountdown, 1000)
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
    }
  }
</script>

<div class={`rounded-3xl p-2 ring-1 ring-primary m-1 mb-4 bg-neutral`}>
  {#if qtyRemaining <= 0}
    <div class="text-error text-xl font-black text-center">{soldOutText}</div>
  {:else if comingSoon}
    <div class="text-secondary text-xl font-black text-center">
      {comingSoonText}
    </div>
    <div class="text-center">
      <div class="flex items-center justify-center">
        <Fa icon={faClock} class="mr-2 text-accent" />
        <span class="text-lg font-semibold text-accent">{countdown}</span>
      </div>
    </div>
  {:else}
    <div class="text-accent text-xl font-black text-center">
      {availableText}
    </div>
  {/if}

  <div
    class="flex items-center justify-center gap-x-4 border-t-2 border-neutral-600"
  >
    <h2 id="tier-startup" class="text-lg font-semibold leading-8 text-white">
      {name}
    </h2>
  </div>

  {#if qtyMax > 0}
    <div
      class="animate-text bg-gradient-to-r from-teal-500 via-purple-500 to-orange-500 bg-clip-text text-transparent text-xl font-black"
    >
      <div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
        <div
          class="bg-blue-600 h-2.5 rounded-full"
          style="width: {(qtySold / qtyMax) * 100}%;"
        ></div>
      </div>
      <div>
        {qtySold}/{qtyMax} Sold
      </div>
    </div>
  {/if}

  <div class="mt-4 mb-4 text-sm leading-6 text-gray-300">{description}</div>

  <div class="flex flex-col gap-y-2 mb-4">
    {#each features as feature}
      <div class="text-gray-300 flex items-center text-xs">
        {#if feature.startsWith('-')}
          <Fa icon={faTimes} class="text-error mr-2" />
        {:else}
          <Fa icon={faCheck} class="text-primary mr-2" />
        {/if}
        <span>{feature.replace(/^-/, '')}</span>
      </div>
    {/each}
  </div>

  <div class="flex flex-col gap-y-2 mb-4">
    <div>Feature Goals</div>
    <div class="text-sm">
      When Flounders sell out, we'll use the funds to achieve these goals.
    </div>
    {#each fundingGoals as goal}
      <div class="text-gray-300 flex items-center text-xs space-x-2">
        <span class="text-primary">▢</span>
        <span>{goal}</span>
      </div>
    {/each}
  </div>

  {#if priceMonthly[0] === 0}
    <p class="mt-6 mb-12 flex items-baseline gap-x-1">
      <span class="text-4xl font-bold tracking-tight text-white">Free</span>
    </p>
  {/if}

  <div class="mt-auto">
    {#if priceAnnually[0] > 0}
      <a
        href={checkoutMonthURL}
        class="mt-auto mb-4 block rounded-md py-2 px-3 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 bg-white/10 text-white hover:bg-white/20 focus-visible:outline-white"
        on:click={handlePricingClick}
      >
        <span class="text-xl font-bold tracking-tight text-white">
          ${priceMonthly[0]}
        </span>
        <span class="text-sm font-semibold leading-6 text-gray-300">
          / {priceMonthly[1]}</span
        >
      </a>
    {/if}
    {#if priceMonthly[0] > 0}
      <a
        href={checkoutYearURL}
        class="block rounded-md py-2 px-3 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 bg-white/10 text-white hover:bg-white/20 focus-visible:outline-white"
        on:click={handlePricingClick}
      >
        <span class="text-xl font-bold tracking-tight text-white">
          ${priceAnnually[0]}
        </span>
        <span class="text-sm font-semibold leading-6 text-gray-300">
          / {priceAnnually[1]}</span
        >
      </a>
    {/if}
  </div>
</div>
