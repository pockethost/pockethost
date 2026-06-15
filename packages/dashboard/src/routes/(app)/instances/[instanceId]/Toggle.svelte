<script lang="ts">
  interface Props {
    checked?: boolean
    loading?: boolean
    disabled?: boolean
    onClass?: string
    offClass?: string
    onText?: string
    offText?: string
    onChange?: (isChecked: boolean) => void
  }

  let {
    checked = $bindable(false),
    loading = false,
    disabled = false,
    onClass = 'text-green-500',
    offClass = 'text-red-500',
    onText = 'ON',
    offText = 'OFF',
    onChange = () => {},
  }: Props = $props()

  const displayOffClass = $derived(loading ? 'text-yellow-500' : offClass)
  const displayOffText = $derived(loading ? 'Stopping...' : offText)
  const isDisabled = $derived(disabled || loading)

  const toggle = () => {
    if (isDisabled) return
    onChange(!checked)
  }
</script>

<div class="ph-power-toggle-wrap" class:ph-power-toggle-wrap--disabled={isDisabled}>
  <span class="ph-power-toggle-label {checked ? onClass : displayOffClass}">
    {checked ? onText : displayOffText}
    {#if loading}
      <span class="ph-power-toggle-spinner" aria-hidden="true"></span>
    {/if}
  </span>

  <button
    type="button"
    role="switch"
    class="ph-power-toggle"
    class:ph-power-toggle--on={checked}
    aria-checked={checked}
    aria-label={checked ? onText : displayOffText}
    disabled={isDisabled}
    onclick={toggle}
  >
    <span class="ph-power-toggle-track">
      <span class="ph-power-toggle-thumb"></span>
    </span>
  </button>
</div>
