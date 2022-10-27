<script lang="ts">
  export let title: string = ''
  export let text: string = ''
  export let icon: string = ''
</script>

<div class="alert alert-warning d-flex gap-3 align-items-center" role="alert">
  {#if icon}
    <i class={icon} />
  {/if}

  <div class="w-100">
    {#if title}<p class="fw-bold mb-0">{title}</p>{/if}

    {#if text}
      {text}
    {:else}
      <slot />
    {/if}
  </div>
</div>
