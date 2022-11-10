<script lang="ts">
  import CodeSample from '$components/CodeSample.svelte'
  import ProvisioningStatus from '$components/ProvisioningStatus.svelte'
  import { PUBLIC_PB_PROTOCOL } from '$env/static/public'
  import { PUBLIC_PB_DOMAIN } from '$src/env'
  import { humanVersion } from '@pockethost/common'
  import { instance } from '../store'

  const { subdomain, status, platform, version } = $instance
  const url = `${PUBLIC_PB_PROTOCOL}://${subdomain}.${PUBLIC_PB_DOMAIN}`
  const code = `const url = '${url}'\nconst client = new PocketBase(url)`
</script>

<svelte:head>
  <title>Code Samples - PocketHost</title>
</svelte:head>

<div>
  <div class="py-4">
    <div class="d-flex gap-3 align-items-center mb-3">
      <h1 class="mb-0">Admin URL</h1>
      <ProvisioningStatus {status} />
    </div>

    <h2><a href={`${url}/_`} target="_blank">{`${url}/_`}</a></h2>
  </div>

  <div>
    JavaScript:
    <CodeSample {code} />
  </div>
  <div>
    Running {platform}
    {humanVersion(platform, version)}
  </div>
</div>
