<script lang="ts">
  export let title: string
  export let step: number
  export let n: number
  import { fly } from 'svelte/transition'
</script>

{#if step === n}
  <div
    class="absolute w-[300px]"
    in:fly={{ x: 400, duration: 300 }}
    out:fly={{ x: -400, duration: 300 }}
  >
    <div class="text-2xl">{title}</div>
    <slot />
  </div>
{/if}
