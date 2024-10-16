<script lang="ts">
  import { faCircleExclamation } from '@fortawesome/free-solid-svg-icons'
  import Fa from 'svelte-fa'
  import { slide } from 'svelte/transition'

  export let message = ''
</script>

{#if message}
  <div in:slide class="alert alert-error mb-4">
    <Fa icon={faCircleExclamation} />
    {message}
  </div>
{/if}
