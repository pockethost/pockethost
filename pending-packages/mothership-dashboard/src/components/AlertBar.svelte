<script lang="ts">
  import { slide } from 'svelte/transition'

  // https://daisyui.com/components/alert/
  type AlertTypes = 'default' | 'info' | 'success' | 'warning' | 'error'

  export let message: string = ''
  export let type: AlertTypes
  export let additionalClasses: string = ''

  // Set up the default alert classes and icon
  let alertTypeClass = ''
  let alertTypeIcon = `<i class="fa-regular fa-circle-info"></i>`

  if (type === 'default') {
    alertTypeClass = ''
    alertTypeIcon = `<i class="fa-regular fa-circle-info"></i>`
  }

  if (type === 'info') {
    alertTypeClass = 'alert-info'
    alertTypeIcon = `<i class="fa-regular fa-circle-info"></i>`
  }

  if (type === 'success') {
    alertTypeClass = 'alert-success'
    alertTypeIcon = `<i class="fa-regular fa-circle-check"></i>`
  }

  if (type === 'warning') {
    alertTypeClass = 'alert-warning'
    alertTypeIcon = `<i class="fa-regular fa-triangle-exclamation"></i>`
  }

  if (type === 'error') {
    alertTypeClass = 'alert-error'
    alertTypeIcon = `<i class="fa-regular fa-circle-xmark"></i>`
  }
</script>

{#if message}
  <div
    class="alert mb-4 {alertTypeClass} {additionalClasses} justify-center"
    transition:slide
    role="alert"
  >
    {@html alertTypeIcon}

    <span>{@html message}</span>
  </div>
{/if}
