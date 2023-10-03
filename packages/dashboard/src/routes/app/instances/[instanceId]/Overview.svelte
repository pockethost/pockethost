<script lang="ts">
  import ProvisioningStatus from '$components/ProvisioningStatus.svelte'
  import AccordionItem from '../../../../components/AccordionItem.svelte'
  import { instance } from './store'

  $: ({ status, version, secondsThisMonth } = $instance)
</script>

<div class="card card-body bg-base-200">
  <h3 class="font-bold text-2xl">Overview</h3>

  <div>
    Status: <ProvisioningStatus {status} />
  </div>

  <div>
    Usage: {Math.ceil(secondsThisMonth / 60)} mins
  </div>

  <div>
    Version: {version}
  </div>
</div>
