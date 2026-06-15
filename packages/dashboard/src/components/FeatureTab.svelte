<script lang="ts">
  import type { Snippet } from 'svelte'
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
    alerts?: Snippet
    summary?: Snippet
    cta?: Snippet
    feature?: Snippet
    reference?: Snippet
    children?: Snippet
  }

  let {
    title,
    documentation = '',
    errorMessage = $bindable(''),
    successMessage = $bindable(''),
    successFlash = false,
    powerOffAction = '',
    powerOffMessage = '',
    alerts,
    summary,
    cta,
    feature,
    reference,
    children,
  }: Props = $props()

  const showAlerts = $derived(!!errorMessage || !!successMessage || !!powerOffAction || !!powerOffMessage || !!alerts)
</script>

<header class="dashboard-page-header">
  <h2 class="dashboard-page-title">{title}</h2>
  {#if documentation}
    <wa-button href={documentation} variant="brand" size="small" appearance="outline" target="_blank">
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
    {#if alerts}
      {@render alerts()}
    {/if}
  </div>
{/if}

{#if summary}
  <div class="dashboard-page-summary">
    {@render summary()}
  </div>
{/if}

{#if cta}
  <div class="dashboard-page-cta">
    {@render cta()}
  </div>
{/if}

{#if feature || children}
  <div class="dashboard-page-feature">
    {#if feature}
      {@render feature()}
    {:else if children}
      {@render children()}
    {/if}
  </div>
{/if}

{#if reference}
  <div class="dashboard-page-reference">
    {@render reference()}
  </div>
{/if}
