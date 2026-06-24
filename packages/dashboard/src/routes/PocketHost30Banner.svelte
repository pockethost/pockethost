<script lang="ts">
  import { flounderDaysLeftLabel, isFlounderSalesOpen, daysUntilFlounderSunset } from '$util/flounderSunset'

  const INFO_PATH = '/3.0'

  $: flounderOpen = isFlounderSalesOpen()
  $: flounderDaysLeft = daysUntilFlounderSunset()
</script>

<div class="border-b border-white/10 bg-gradient-to-r from-sky-500/15 via-primary/10 to-transparent">
  <div class="max-w-content mx-auto px-4 md:px-20 py-2.5">
    <div class="flex items-start gap-3 min-w-0 sm:items-center">
      <wa-icon name="circle-info" class="mt-0.5 shrink-0 text-sky-400 text-sm sm:mt-0"></wa-icon>
      <p class="min-w-0 flex-1 text-sm leading-snug text-white/90">
        <span class="font-medium">Flounder lifetime ends July 1</span>
        {#if flounderOpen}
          ({flounderDaysLeftLabel(flounderDaysLeft)})
        {/if}
        . Jul 1 also enforces Pay Per PocketBase slot and storage limits. Existing subscribers keep their billing.
        <a href={INFO_PATH} class="text-primary hover:text-secondary underline underline-offset-2"> What's changing </a>
      </p>
    </div>
  </div>
</div>
