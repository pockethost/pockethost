<script lang="ts">
  import { InstanceStatus } from '@pockethost/common/src/schema'
  import { ProvisioningSize } from './types'

  export let status: InstanceStatus = InstanceStatus.Unknown
  export let size: ProvisioningSize = ProvisioningSize.Normal
</script>

<div class={`status ${status} ${size}`}>{status}</div>

<style lang="scss">
  .status {
    border-radius: 5px;
    display: inline-block;
    padding: 3px;
    font-size: 10px;
    background-color: rgb(217, 138, 10);
    color: white;
    &.started {
      background-color: green;
    }
    &.failed {
      background-color: red;
    }
    &.hero {
      font-size: 50px;
      padding: 20px;
      border-radius: 20px;
      border: 1px solid black;
    }
  }
</style>
