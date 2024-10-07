<script lang="ts">
  import TextBlock from './TextBlock.svelte'
  import YesBlock from './YesBlock.svelte'
  import NoBlock from './NoBlock.svelte'

  export let item: string
</script>

{#if item === 'YesBlock'}
  <YesBlock />
{:else if item === 'NoBlock'}
  <NoBlock />
{:else}
  <TextBlock>{@html item}</TextBlock>
{/if}
