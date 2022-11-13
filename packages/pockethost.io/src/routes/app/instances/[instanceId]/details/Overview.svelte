<script lang="ts">
  import ProvisioningStatus from '$components/ProvisioningStatus.svelte'
  import { PUBLIC_PB_PROTOCOL } from '$env/static/public'
  import { PUBLIC_PB_DOMAIN } from '$src/env'
  import { humanVersion } from '@pockethost/common'
  import { instance } from '../store'

  const { subdomain, status, platform, version } = $instance
  const url = `${PUBLIC_PB_PROTOCOL}://${subdomain}.${PUBLIC_PB_DOMAIN}`
</script>

<div class="py-4">
  <h2>Overview</h2>
  <ProvisioningStatus {status} />
  <div>
    Running {platform}
    {humanVersion(platform, version)}
  </div>
  <div>
    Admin URL: <a href={`${url}/_`} target="_blank">{`${url}/_`}</a>
  </div>
</div>
