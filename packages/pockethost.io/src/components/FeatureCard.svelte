<script lang="ts">
  export let title: string = ''
  export let subtitle: string = ''
  export let icon: string = ''
  export let fullHeight: boolean = false
</script>

<div class="card {fullHeight && 'h-100'}">
  <div class="card-body">
    {#if icon}
      <div class="d-flex align-items-center gap-3 mb-3">
        <div class="card-icon">
          <i class={icon} />
        </div>

        <div>
          {#if title}<h5 class="card-title {!subtitle && 'mb-0'}">{title}</h5>{/if}
          {#if subtitle}<h6 class="card-subtitle mb-0 text-muted">{subtitle}</h6>{/if}
        </div>
      </div>
    {:else}
      {#if title}<h5 class="card-title">{title}</h5>{/if}
      {#if subtitle}<h6 class="card-subtitle mb-2 text-muted">{subtitle}</h6>{/if}
    {/if}

    <slot />
  </div>
</div>

<style>
  .card {
    border: 0;
    box-shadow: var(--soft-box-shadow);
    border-radius: 18px;
  }
  .card-icon {
    background-color: var(--bs-gray-200);
    width: 35px;
    height: 35px;
    border-radius: 35px;
    font-size: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
