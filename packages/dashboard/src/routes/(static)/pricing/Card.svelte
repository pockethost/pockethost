<script lang="ts">
  import { faCheck } from '@fortawesome/free-solid-svg-icons'
  import Fa from 'svelte-fa'

  export let feature: any
</script>

<div class="relative w-full max-w-md bg-white dark:bg-neutral text-gray-900 dark:text-white rounded-2xl shadow-lg overflow-hidden transition hover:scale-[1.02]">
  <div class="absolute top-0 left-0 bg-primary text-white text-xl p-2 rounded-br-2xl">
    <Fa icon={faCheck} />
  </div>
  <div class="px-6 py-5">
    <h3 class="text-2xl font-bold mb-4">{feature.title}</h3>

    {#if feature.img}
      <div class="flex justify-center mb-4">
        <enhanced:img src={feature.img} class="rounded-lg border w-full max-h-48 object-contain" />
      </div>
    {/if}

    <div class="text-base leading-relaxed">{@html feature.description}</div>
  </div>
</div>

