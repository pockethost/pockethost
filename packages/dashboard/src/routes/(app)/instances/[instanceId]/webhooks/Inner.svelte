<script lang="ts">
  import Form from './Form.svelte'
  import List from './List.svelte'
  import { items } from './stores'
</script>

{#if $items.length > 0}
  <List />
{/if}
<Form />
