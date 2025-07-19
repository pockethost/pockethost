<script lang="ts">
  export let checked = false
  export let onClass = 'success'
  export let offClass = 'red-500'
  export let onText = 'ON'
  export let offText = 'OFF'
  export let onChange = (isChecked: boolean) => {}

  const handleChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    const isChecked = target.checked
    e.preventDefault()
    onChange(isChecked)
  }
</script>

<div class="form-control w-fit">
  <label class="label cursor-pointer">
    <span class="label-text text-lg mr-2">
      <span class="font-bold text-{checked ? onClass : offClass}">{checked ? onText : offText}</span></span
    >
    <input
      type="checkbox"
      class="toggle bg-{checked ? onClass : offClass} hover:bg-{checked ? onClass : offClass}"
      {checked}
      on:change={handleChange}
    />
  </label>
</div>
