<script lang="ts">
  import AlertBar from '$components/AlertBar.svelte'
  import PowerOffRequired from '$components/PowerOffRequired.svelte'

  interface Props {
    title: string
    documentation?: string
    errorMessage?: string
    successMessage?: string
    successFlash?: boolean
    powerOffAction?: string
    powerOffMessage?: string
  }

  let {
    title,
    documentation = '',
    errorMessage = $bindable(''),
    successMessage = $bindable(''),
    successFlash = false,
    powerOffAction = '',
    powerOffMessage = '',
  }: Props = $props()

  const showAlerts = $derived(
    !!errorMessage || !!successMessage || !!powerOffAction || !!powerOffMessage || !!$$slots.alerts
  )
</script>

<header class="dashboard-page-header">
  <h2 class="dashboard-page-title">{title}</h2>
  {#if documentation}
    <wa-button href={documentation} variant="brand" size="s" appearance="outline" target="_blank">
      Full documentation
      <wa-icon slot="end" name="arrow-up-right-from-square" class="opacity-50 text-sm"></wa-icon>
    </wa-button>
  {/if}
</header>

{#if showAlerts}
  <div class="dashboard-page-alerts">
    <AlertBar message={errorMessage} type="error" />
    <AlertBar message={successMessage} type="success" flash={successFlash} />
    {#if powerOffAction || powerOffMessage}
      <PowerOffRequired action={powerOffAction || undefined} poweredOffMessage={powerOffMessage || undefined} />
    {/if}
    <slot name="alerts" />
  </div>
{/if}

{#if $$slots.summary}
  <div class="dashboard-page-summary">
    <slot name="summary" />
  </div>
{/if}

{#if $$slots.cta}
  <div class="dashboard-page-cta">
    <slot name="cta" />
  </div>
{/if}

{#if $$slots.feature || $$slots.default}
  <div class="dashboard-page-feature">
    <slot name="feature">
      <slot />
    </slot>
  </div>
{/if}

{#if $$slots.reference}
  <div class="dashboard-page-reference">
    <slot name="reference" />
  </div>
{/if}
