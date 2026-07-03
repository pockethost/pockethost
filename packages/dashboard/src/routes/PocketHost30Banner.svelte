<script lang="ts">
  const PRICING_PATH = '/pricing'
</script>

<div class="border-b border-white/10 bg-gradient-to-r from-sky-500/15 via-primary/10 to-transparent">
  <div class="max-w-content mx-auto px-4 md:px-20 py-2.5">
    <div class="flex items-start gap-3 min-w-0 sm:items-center">
      <wa-icon name="circle-info" class="mt-0.5 shrink-0 text-sky-400 text-sm sm:mt-0"></wa-icon>
      <p class="min-w-0 flex-1 text-sm leading-snug text-white/90">
        <span class="font-medium">Pay Per PocketBase</span>
        at $9.99/mo, $59.99/yr, or $149.99 lifetime per slot.
        <a href={PRICING_PATH} class="text-primary hover:text-secondary underline underline-offset-2"> See pricing </a>
      </p>
    </div>
  </div>
</div>
