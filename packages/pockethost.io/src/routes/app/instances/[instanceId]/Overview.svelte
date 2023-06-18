<script lang="ts">
  import ProvisioningStatus from '$components/ProvisioningStatus.svelte'
  import { PUBLIC_APP_DOMAIN, PUBLIC_APP_PROTOCOL } from '$src/env'
  import type { InstanceFields } from '@pockethost/common'
  import AccordionItem from './AccordionItem.svelte'

  export let instance: InstanceFields

  const { subdomain, status, version } = instance
  const url = `${PUBLIC_APP_PROTOCOL}://${subdomain}.${PUBLIC_APP_DOMAIN}`
</script>

<AccordionItem title="Overview" show={true}>
  <div>
    Status: <ProvisioningStatus {status} />
  </div>
  <div>
    Usage: {Math.ceil(instance.secondsThisMonth / 60)} mins
  </div>
  <div>
    Version: {version} (change in Danger Zone)
  </div>
</AccordionItem>
