<script lang="ts">
  import {
    faCircleCheck,
    faCircleInfo,
    faCircleXmark,
    faTriangleExclamation,
    type IconDefinition,
  } from '@fortawesome/free-solid-svg-icons'
  import Fa from 'svelte-fa'
  import { slide } from 'svelte/transition'

  // https://daisyui.com/components/alert/
  type AlertTypes = 'default' | 'info' | 'success' | 'warning' | 'error'

  export let message: string = ''
  export let type: AlertTypes
  export let additionalClasses: string = ''
  export let flash = false

  let isHidden = false
  $: {
    isHidden = false
    if (flash && message) {
      setTimeout(() => {
        isHidden = true
      }, 5000)
    }
  }

  // Set up the default alert classes and icon
  let alertTypeClass = ''
  let alertTypeIcon: IconDefinition = faCircleInfo

  if (type === 'default') {
    alertTypeClass = ''
    alertTypeIcon = faCircleInfo
  }

  if (type === 'info') {
    alertTypeClass = 'alert-info'
    alertTypeIcon = faCircleInfo
  }

  if (type === 'success') {
    alertTypeClass = 'alert-success'
    alertTypeIcon = faCircleCheck
  }

  if (type === 'warning') {
    alertTypeClass = 'alert-warning'
    alertTypeIcon = faTriangleExclamation
  }

  if (type === 'error') {
    alertTypeClass = 'alert-error'
    alertTypeIcon = faCircleXmark
  } 
</script>

{#if message && !isHidden}
  <div class="alert flex md:justify-start text-left mb-4 {alertTypeClass}  {additionalClasses} justify-center" transition:slide role="alert">
    <Fa icon={alertTypeIcon} />
    <span>{@html message}</span>
  </div>
{/if}
