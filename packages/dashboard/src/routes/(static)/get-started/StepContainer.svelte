<script lang="ts">
  export let title: string
  import { fly } from 'svelte/transition'
</script>

<div
  class="absolute w-[300px]"
  in:fly={{ x: 400, duration: 300 }}
  out:fly={{ x: -400, duration: 300 }}
>
  <div class="text-2xl">{title}</div>
  <slot />
</div>
