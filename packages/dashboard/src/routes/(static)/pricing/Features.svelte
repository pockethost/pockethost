<script lang="ts">
  import Card from './Card.svelte'
  import { features } from './features'
</script>

{#each features as feature}
  <Card {feature} />
{/each}
