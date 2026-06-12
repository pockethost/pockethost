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

  const handleChange = (e: Event) => {
    if (isDisabled) {
      e.preventDefault()
      return
    }
    const target = e.target as HTMLInputElement
    onChange(target.checked)
  }
</script>

<div class="flex items-center gap-2 w-fit" class:opacity-60={isDisabled}>
  <span class="text-sm md:text-lg font-bold flex items-center gap-2 {checked ? onClass : displayOffClass}">
    {checked ? onText : displayOffText}
    {#if loading}
      <span class="inline-block w-4 h-4 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin"></span>
    {/if}
  </span>
  <wa-switch {checked} disabled={isDisabled} onchange={handleChange}></wa-switch>
</div>
