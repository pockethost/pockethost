<script lang="ts">
  type AlertTypes = 'default' | 'info' | 'success' | 'warning' | 'error'

  interface Props {
    message?: string
    type: AlertTypes
    additionalClasses?: string
    flash?: boolean
  }

  let { message = '', type, additionalClasses = '', flash = false }: Props = $props()

  let isHidden = $state(false)

  $effect(() => {
    isHidden = false
    if (flash && message) {
      const timer = setTimeout(() => {
        isHidden = true
      }, 5000)
      return () => clearTimeout(timer)
    }
  })

  const variantMap: Record<AlertTypes, string> = {
    default: 'neutral',
    info: 'brand',
    success: 'success',
    warning: 'warning',
    error: 'danger',
  }

  const iconMap: Record<AlertTypes, string> = {
    default: 'circle-info',
    info: 'circle-info',
    success: 'circle-check',
    warning: 'triangle-exclamation',
    error: 'circle-xmark',
  }
</script>

{#if message && !isHidden}
  <wa-callout variant={variantMap[type]} class="wa-callout-padded mb-4 {additionalClasses}">
    <wa-icon slot="icon" name={iconMap[type]}></wa-icon>
    <span>{@html message}</span>
  </wa-callout>
{/if}
