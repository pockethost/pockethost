<script lang="ts">
  import Card from './Card.svelte'
  import { features } from './features'
  
</script>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-7xl px-4 mx-auto py-4">
  {#each features as feature}
    <div class="rounded-2xl flex bg-white/5 backdrop-blur-sm border border-white/10 p-6 flex-col md:flex-row transition transform hover:-translate-y-1 hover:shadow-xl duration-300 {feature.img && 'md:col-span-2'}">
      <!-- <div class="flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-purple-600 text-white text-2xl mb-4">
        {feature.icon}
      </div> -->
      <div> 
        <h3 class="text-lg font-semibold text-white mb-2">{feature.title}</h3>
        
        <p class="text-sm text-gray-300 leading-relaxed">{@html feature.description}</p>
      </div>
      {#if feature.img}
        <div class="h-full mt-4 md:mt-0">
          <enhanced:img src={feature.img} class="rounded-lg border h-full object-contain" />
        </div>
      {/if}
    </div>
  {/each}
</div>