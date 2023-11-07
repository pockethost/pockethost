<script lang="ts">
  import ProvisioningStatus from '$components/ProvisioningStatus.svelte'
  import { instance } from './store'

  $: ({ status, version } = $instance)
</script>

<div class="card card-body bg-base-200">
  <h3 class="font-bold text-2xl">Overview</h3>

  <div>
    Status: <ProvisioningStatus {status} />
  </div>

  <div>
    Version: {version}
  </div>
</div>
