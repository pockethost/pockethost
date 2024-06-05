<script type="ts">
  import { fade } from 'svelte/transition'
  import { items } from './stores'

  let showSecretKeys = false
</script>

<div class="flex items-center justify-between mb-3 h-9">
  <h4 class="font-bold text-lg">Current Environment Variables</h4>

  <div class="form-control">
    <label class="label cursor-pointer">
      <span class="label-text text-accent mr-2">Show Secrets</span>
      <input
        type="checkbox"
        class="toggle toggle-sm"
        bind:checked={showSecretKeys}
      />
    </label>
  </div>
</div>

<table class="table">
  <thead>
    <tr>
      <th class="w-2/5 border-b-2 border-neutral">Key</th>
      <th class="w-2/5 border-b-2 border-neutral">Value</th>
      <th class="w-1/5 border-b-2 border-neutral text-right">Actions</th>
    </tr>
  </thead>

  <tbody>
    {#each $items as item}
      <tr transition:fade>
        <th>{item.name}</th>
        <td
          >{showSecretKeys
            ? item.value
            : item.value.slice(0, 2) +
              item.value.slice(2).replaceAll(/./g, '*')}</td
        >
        <td class="text-right">
          <button
            aria-label="Delete"
            on:click={() => items.delete(item.name)}
            type="button"
            class="btn btn-sm btn-square btn-outline btn-warning"
            ><i class="fa-regular fa-trash"></i></button
          >
        </td>
      </tr>
    {/each}
  </tbody>
</table>
