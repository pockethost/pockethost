<script lang="ts">
  import { formatStorageBytes, storageUsagePercent } from 'pockethost/common'

  export let label: string
  export let usedBytes = 0
  export let limitBytes = 0
  export let subline = ''

  $: percent = storageUsagePercent(usedBytes, limitBytes)
  $: barValue = limitBytes > 0 ? Math.min(100, (usedBytes / limitBytes) * 100) : 0
  $: overLimit = limitBytes > 0 && usedBytes > limitBytes
  $: nearLimit = !overLimit && limitBytes > 0 && percent >= 90
  $: usageLabel =
    limitBytes > 0
      ? `${formatStorageBytes(usedBytes)} of ${formatStorageBytes(limitBytes)} used`
      : `${formatStorageBytes(usedBytes)} used`
</script>

<div class="account-storage-meter">
  <div class="account-storage-meter-head">
    <span class="account-storage-meter-label">{label}</span>
    <span class="account-storage-meter-usage" class:account-storage-meter-usage--warn={nearLimit || overLimit}>
      {usageLabel}
    </span>
  </div>
  <wa-progress-bar
    class="account-storage-meter-bar"
    class:account-storage-meter-bar--warn={nearLimit}
    class:account-storage-meter-bar--over={overLimit}
    value={barValue}
    label="{label} usage"
  ></wa-progress-bar>
  {#if subline}
    <p class="account-stat-subline">{subline}</p>
  {/if}
</div>
