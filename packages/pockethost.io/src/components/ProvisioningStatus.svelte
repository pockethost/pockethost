<script lang="ts">
  import { InstanceStatus } from '@pockethost/common/src/schema'
  import { onMount } from 'svelte'

  export let status: InstanceStatus = InstanceStatus.Idle

  let badgeColor: string = 'bg-secondary'

  if (!status) {
    status = InstanceStatus.Idle
  }

  const handleBadgeColor = () => {
    switch (status) {
      case 'idle':
        badgeColor = 'bg-secondary'
        break
      case 'porting':
        badgeColor = 'bg-info'
        break
      case 'starting':
        badgeColor = 'bg-warning'
        break
      case 'running':
        badgeColor = 'bg-success'
        break
      case 'failed':
        badgeColor = 'bg-danger'
        break
      default:
        badgeColor = 'bg-secondary'
        break
    }
  }

  onMount(() => {
    handleBadgeColor()
  })

  // Watch for changes with the status variable and update the badge color
  $: if (status) handleBadgeColor()
</script>

<div class={`badge ${badgeColor} ${status === 'running' && 'pulse'}`}>{status}</div>

<style lang="scss">
  .pulse {
    box-shadow: 0 0 0 0 rgba(46, 204, 113, 1);
    transform: scale(1);
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.7);
    }

    70% {
      transform: scale(1);
      box-shadow: 0 0 0 10px rgba(46, 204, 113, 0);
    }

    100% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(46, 204, 113, 0);
    }
  }
</style>
