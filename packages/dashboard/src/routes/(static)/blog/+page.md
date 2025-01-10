<script lang="ts">
  import { toc } from './toc'
</script>

{#each toc as item}

## [{item.title}]({item.path})

{/each}
