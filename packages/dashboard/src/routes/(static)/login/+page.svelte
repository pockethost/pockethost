<script lang="ts">
  import { page } from '$app/stores'
  import InstanceGeneratorWidget from '../get-started/InstanceGeneratorWidget.svelte'

  $: emailChanged = $page.url.searchParams.get('emailChanged') === '1'
</script>

<div class="w-full flex flex-col items-center justify-center px-4 md:px-16 py-10 md:py-16">
  {#if emailChanged}
    <div class="w-full max-w-md mb-4">
      <wa-callout variant="success" class="wa-callout-padded">
        Email updated. Sign in with your new address.
      </wa-callout>
    </div>
  {/if}
  <InstanceGeneratorWidget login />
</div>
