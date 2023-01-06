<script lang="ts">
  import ProvisioningStatus from '$components/ProvisioningStatus.svelte'
  import { PUBLIC_APP_DOMAIN, PUBLIC_APP_PROTOCOL } from '$src/env'
  import type { InstanceFields } from '@pockethost/common'

  export let instance: InstanceFields

  const { subdomain, status, version } = instance
  const url = `${PUBLIC_APP_PROTOCOL}://${subdomain}.${PUBLIC_APP_DOMAIN}`
</script>

<div class="py-4">
  <h2>Overview</h2>
  <ProvisioningStatus {status} />
  Usage: {Math.ceil(instance.secondsThisMonth / 60)} mins
  <div>
    Running {version}
  </div>
  <div>
    Admin URL: <a href={`${url}/_`} target="_blank">{`${url}/_`}</a>
  </div>
</div>
