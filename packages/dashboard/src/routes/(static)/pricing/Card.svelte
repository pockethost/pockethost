<script lang="ts">
  import { faCheck } from '@fortawesome/free-solid-svg-icons'
  import Fa from 'svelte-fa'

  export let feature: any
</script>

<div
  class="flex flex-col items-center prose bg-neutral text-neutral-content rounded-lg relative w-full"
>
  <div class="text-2xl text-white pt-2">
    {feature.title}
  </div>
  {#if feature.img}
    <enhanced:img src={feature.img} class="pl-5 pr-5" />
  {/if}
  <div class="text-xl p-5">{@html feature.description}</div>
  <div
    class="absolute top-0 left-0 text-primary-content text-2xl bg-primary p-2 rounded-br-lg rounded-tl-lg"
  >
    <Fa icon={faCheck} class="" />
  </div>
</div>
