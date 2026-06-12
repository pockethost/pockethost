<script lang="ts">
  interface Props {
    checked?: boolean
    onClass?: string
    offClass?: string
    onText?: string
    offText?: string
    onChange?: (isChecked: boolean) => void
  }

  let {
    checked = $bindable(false),
    onClass = 'text-green-500',
    offClass = 'text-red-500',
    onText = 'ON',
    offText = 'OFF',
    onChange = () => {},
  }: Props = $props()

  const handleChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    onChange(target.checked)
  }
</script>

<div class="flex items-center gap-2 w-fit">
  <span class="text-sm md:text-lg font-bold {checked ? onClass : offClass}">
    {checked ? onText : offText}
  </span>
  <wa-switch checked={checked} onchange={handleChange}></wa-switch>
</div>
