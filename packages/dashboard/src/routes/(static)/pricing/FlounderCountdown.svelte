<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import {
    daysUntilFlounderSunset,
    flounderDaysLeftLabel,
    FLOUNDER_SALES_END_LABEL,
    isFlounderSalesOpen,
  } from '$util/flounderSunset'

  let daysLeft = daysUntilFlounderSunset()
  let open = isFlounderSalesOpen()

  let interval: ReturnType<typeof setInterval> | undefined

  onMount(() => {
    interval = setInterval(() => {
      daysLeft = daysUntilFlounderSunset()
      open = isFlounderSalesOpen()
    }, 60_000)
  })

  onDestroy(() => {
    if (interval) clearInterval(interval)
  })
</script>

{#if open}
  <div class="pricing-flounder-countdown">
    <wa-icon name="hourglass-half" class="pricing-flounder-countdown-icon"></wa-icon>
    <p class="pricing-flounder-countdown-text">
      <span class="pricing-flounder-countdown-emphasis">{flounderDaysLeftLabel(daysLeft)}</span>
      until Flounder lifetime sales end on {FLOUNDER_SALES_END_LABEL}.
      <a href="/blog/flounder-lifetime-sunset" class="pricing-flounder-countdown-link">Learn more</a>
    </p>
  </div>
{/if}
