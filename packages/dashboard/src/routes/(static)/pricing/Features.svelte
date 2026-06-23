<script lang="ts">
  import { highlights } from './features'
</script>

<ul class="pricing-highlights">
  {#each highlights as item}
    <li class="pricing-highlight">
      <wa-icon name={item.icon} class="pricing-highlight-icon"></wa-icon>
      <div>
        <h3 class="pricing-highlight-title">{item.title}</h3>
        <p class="pricing-highlight-desc">{item.description}</p>
      </div>
    </li>
  {/each}
</ul>
