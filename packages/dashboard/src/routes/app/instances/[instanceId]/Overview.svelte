<script lang="ts">
  import ProvisioningStatus from '$components/ProvisioningStatus.svelte'
  import { PUBLIC_APP_DOMAIN, PUBLIC_APP_PROTOCOL } from '$src/env'
  import AccordionItem from '../../../../components/AccordionItem.svelte'
  import { instance } from './store'

  $: ({ subdomain, status, version, secondsThisMonth } = $instance)

  const url = `${PUBLIC_APP_PROTOCOL}://${subdomain}.${PUBLIC_APP_DOMAIN}`
</script>

<AccordionItem title="Overview" show={true}>
  <div>
    Status: <ProvisioningStatus {status} />
  </div>
  <div>
    Usage: {Math.ceil(secondsThisMonth / 60)} mins
  </div>
  <div>
    Version: {version} (change in Danger Zone)
  </div>
</AccordionItem>
