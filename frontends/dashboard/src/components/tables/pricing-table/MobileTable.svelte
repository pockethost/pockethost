<script lang="ts">
  import FeatureSupportBlock from '$components/tables/pricing-table/FeatureSupportBlock.svelte'

  export let feature: string
  export let item: string
</script>

<div
  class="flex items-center justify-between px-4 py-3 sm:grid sm:grid-cols-2 sm:px-0"
>
  <dt class="pr-4">{feature}</dt>
  <dd class="flex items-center justify-end sm:justify-center sm:px-4">
    <FeatureSupportBlock {item} />
  </dd>
</div>
