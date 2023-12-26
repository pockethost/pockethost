<script lang="ts">
  import TextBlock from '$components/tables/pricing-table/TextBlock.svelte'
  import YesBlock from '$components/tables/pricing-table/YesBlock.svelte'
  import NoBlock from '$components/tables/pricing-table/NoBlock.svelte'

  export let item: string
</script>

{#if item === 'YesBlock'}
  <YesBlock />
{:else if item === 'NoBlock'}
  <NoBlock />
{:else}
  <TextBlock>{item}</TextBlock>
{/if}
