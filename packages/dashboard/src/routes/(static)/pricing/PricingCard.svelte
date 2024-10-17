<script lang="ts">
  import { faClock, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons'
  import Fa from 'svelte-fa'
  import { onMount, onDestroy } from 'svelte'
  export let name = ''
  export let description = ''
  export let priceMonthly: [number, string?, number?] = [0, '']
  export let priceAnnually: [number, string?, number?] = [0, '']
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
  export let startDate: Date | null = null

  $: qtySold = qtyMax - qtyRemaining

  let countdown = ''
  let countdownInterval: ReturnType<typeof setInterval>

  function updateCountdown() {
    if (!startDate) return

    const now = new Date()
    const difference = startDate.getTime() - now.getTime()

    if (difference <= 0) {
      countdown = ''
      clearInterval(countdownInterval)
      return
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24))
    const hours = Math.floor(
      (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    )
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((difference % (1000 * 60)) / 1000)

    countdown = `${days}d ${hours}h ${minutes}m ${seconds}s`
  }

  onMount(() => {
    if (startDate) {
      updateCountdown()
      countdownInterval = setInterval(updateCountdown, 1000)
    }
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

<!-- It's a card, so use card -->
<div class="card bg-base-100 w-96 shadow-xl">
  <div class="card-body items-center text-center">
    <div class="card-title">
      <h2 id="tier-startup" class="text-2xl font-semibold leading-8 text-white">
        {name}
      </h2>
    </div>

    {#if qtyRemaining <= 0}
      <div class="text-error text-xl font-black text-center">{soldOutText}</div>
    {:else if comingSoon}
      <div class="text-secondary text-xl font-black text-center">
        {comingSoonText}
      </div>
      {#if startDate && countdown}
        <div class="text-center">
          <div class="flex items-center justify-center">
            <Fa icon={faClock} class="mr-2 text-accent" />
            <span class="text-lg font-semibold text-accent">{countdown}</span>
          </div>
        </div>
      {/if}
    {:else}
      <div class="text-accent text-xl font-black text-center">
        {availableText}
      </div>
    {/if}

    {#if qtyMax > 0}
      <div
        class="w-full animate-text bg-gradient-to-r from-teal-500 via-purple-500 to-orange-500 bg-clip-text text-transparent text-xl font-black"
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

    <div class="mt-4 mb-4 leading-6 text-gray-300 text-left">{description}</div>

    <div class="flex flex-col gap-y-2 mb-4">
      {#each features as feature}
        <div class="text-gray-300 flex items-center text-sm">
          {#if feature.startsWith('-')}
            <Fa icon={faTimes} class="text-error mr-2" />
          {:else}
            <Fa icon={faCheck} class="text-primary mr-2" />
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

    <div class="card-actions">
      {#if priceAnnually[0] > 0}
        <a
          href={comingSoon ? undefined : checkoutMonthURL}
          class={`btn ${qtyRemaining <= 0 ? 'btn-disabled' : ''} w-full rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 bg-white/10 hover:bg-white/20 focus-visible:outline-white `}
          on:click={handlePricingClick}
          aria-disabled={qtyRemaining <= 0}
        >
          {#if priceMonthly[2]}
            <span
              class={`text-xl font-bold tracking-tight ${qtyRemaining <= 0 ? 'text-gray-700' : 'text-gray-400'} line-through`}
            >
              ${priceMonthly[0]}
            </span>
            <span class={`text-xl font-bold tracking-tight`}>
              ${priceMonthly[2]}
            </span>
          {:else}
            <span class="text-xl font-bold tracking-tight">
              ${priceMonthly[0]}
            </span>
          {/if}
          <span
            class={`text-sm font-semibold leading-6 ${qtyRemaining <= 0 ? 'text-gray-600' : 'text-gray-300'}`}
          >
            / {priceMonthly[1]}
          </span>
        </a>
      {/if}
      {#if priceMonthly[0] > 0}
        <a
          href={comingSoon ? undefined : checkoutYearURL}
          class={`btn ${qtyRemaining <= 0 ? 'btn-disabled' : ''} w-full rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 bg-white/10 text-white hover:bg-white/20 focus-visible:outline-white `}
          on:click={handlePricingClick}
        >
          {#if priceAnnually[2]}
            <span
              class={`text-xl font-bold tracking-tight ${qtyRemaining <= 0 ? 'text-gray-700' : 'text-gray-400'} line-through`}
            >
              ${priceAnnually[0]}
            </span>
            <span class="text-xl font-bold tracking-tight">
              ${priceAnnually[2]}
            </span>
          {:else}
            <span class="text-xl font-bold tracking-tight">
              ${priceAnnually[0]}
            </span>
          {/if}
          <span
            class="text-sm font-semibold leading-6 ${qtyRemaining <= 0
              ? 'text-gray-600'
              : 'text-gray-300'}"
          >
            / {priceAnnually[1]}</span
          >
        </a>
      {/if}
    </div>
  </div>
</div>
