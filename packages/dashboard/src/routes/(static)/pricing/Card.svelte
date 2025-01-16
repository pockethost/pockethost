<script lang="ts">
  import { faCheck } from '@fortawesome/free-solid-svg-icons'
  import Fa from 'svelte-fa'

  export let feature: any
</script>

<div
  class="flex flex-col items-center prose bg-neutral text-neutral-content rounded-lg relative w-full"
>
  <div class="text-2xl text-white pt-2 mb-5">
    {feature.title}
  </div>
  {#if feature.img}
    <div class="flex justify-center mr-5 ml-5 mb-5 not-prose">
      <enhanced:img
        src={feature.img}
        class="rounded border border-1 border-gray-500 w-fit"
      />
    </div>
  {/if}
  <div class="text-xl p-5 pt-0">{@html feature.description}</div>
  <div
    class="absolute top-0 left-0 text-primary-content text-2xl bg-primary p-2 rounded-br-lg rounded-tl-lg"
  >
    <Fa icon={faCheck} class="" />
  </div>
</div>
