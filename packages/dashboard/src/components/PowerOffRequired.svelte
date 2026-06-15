<script lang="ts">
  import AlertBar from '$components/AlertBar.svelte'
  import { instance } from '$src/routes/(app)/instances/[instanceId]/store'
  import { isInstanceShuttingDown } from '$util/instancePower'

  interface Props {
    action?: string
    poweredOffMessage?: string
  }

  let {
    action,
    poweredOffMessage = action
      ? `Your instance must be powered off to ${action}.`
      : 'Your instance must be powered off first.',
  }: Props = $props()

  const power = $derived($instance?.power ?? false)
  const isShuttingDown = $derived($instance ? isInstanceShuttingDown($instance) : false)
</script>

{#if power && !isShuttingDown}
  <AlertBar message={poweredOffMessage} type="error" />
{:else if isShuttingDown}
  <AlertBar message="Instance is shutting down. Please wait until it has fully stopped." type="warning" />
{/if}
