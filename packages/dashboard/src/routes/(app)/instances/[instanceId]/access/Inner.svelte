<script lang="ts">
  import {
    DEFAULT_RATE_LIMIT_PROFILE,
    getEffectiveIpLimits,
    parseTrustedIpEntries,
    TRUSTED_IPS_FREE_MAX,
    TRUSTED_IPS_PAID_MAX,
  } from 'pockethost/common'
  import { INSTANCE_ADMIN_LOGS_URL } from '$src/env'
  import { isUserPaid } from '$util/stores'
  import { instance } from '../store'
  import TrustedIpForm from './TrustedIpForm.svelte'
  import TrustedIpList from './TrustedIpList.svelte'
  import ProxySection from './ProxySection.svelte'
  import { proxyItems, trustedItems } from './stores'

  $: {
    trustedItems.setAll(parseTrustedIpEntries($instance.trusted_ips))
    proxyItems.setAll(parseTrustedIpEntries($instance.proxy_ips))
  }

  $: paid = $isUserPaid
  $: trustedMax = paid ? TRUSTED_IPS_PAID_MAX : TRUSTED_IPS_FREE_MAX
  $: boosted = getEffectiveIpLimits(DEFAULT_RATE_LIMIT_PROFILE, 'boost')
  $: defaultIp = getEffectiveIpLimits(DEFAULT_RATE_LIMIT_PROFILE, 'default')
  $: adminLogsUrl = INSTANCE_ADMIN_LOGS_URL($instance)
</script>

<div class="mb-6">
  <p>
    Trusted IPs get a higher <strong>per-IP</strong> quota on this instance — useful when many users share one network
    address (office NAT, conference WiFi). Instance-wide limits still apply as a ceiling.
  </p>
  <p class="mt-2 text-sm opacity-80">
    Default per IP: {defaultIp.ipBurst}/min, {defaultIp.ipHourly}/hr, {defaultIp.ipConcurrent} concurrent. Boosted trusted
    IPs: {boosted.ipBurst}/min, {boosted.ipHourly}/hr, {boosted.ipConcurrent} concurrent. You can add up to {trustedMax}
    trusted IPs on your plan.
  </p>
  <p class="mt-4 text-sm">
    Not sure which IP to add? Open
    <a href={adminLogsUrl} target="_blank" rel="noreferrer" class="link">PocketBase admin → Logs</a>
    (<code class="text-xs">{adminLogsUrl}</code>) — each request line shows the client IP as PocketBase and the PocketHost
    firewall see it. See <a href="/docs/access" class="link">Access Controls</a> for details.
  </p>
</div>

<TrustedIpList />
<TrustedIpForm />

<div class="divider my-10" />

<ProxySection />
