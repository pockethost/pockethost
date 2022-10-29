<script lang="ts">
  import { AlertTypes } from '$components/AlertBar.types'

  export let title: string = ''
  export let text: string = ''
  export let icon: string = ''
  export let alertType: AlertTypes = AlertTypes.Warning
</script>

<div class="alert alert-{alertType} d-flex gap-3 align-items-center" role="alert">
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
