<script lang="ts">
  export let feature: any
</script>

<div class="card bg-accent text-accent-content shadow-xl mr-auto ml-auto">
  <div class="card-body">
    <h2 class="card-title">{feature.title}</h2>
    {#if feature.img}
      <enhanced:img src={feature.img} />
    {/if}
    <p>{@html feature.description}</p>
    <div class="card-actions justify-end"></div>
  </div>
</div>
