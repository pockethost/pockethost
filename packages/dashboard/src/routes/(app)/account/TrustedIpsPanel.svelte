<script lang="ts">
  import FeatureTab from '$components/FeatureTab.svelte'
  import { client } from '$src/pocketbase-client'
  import { TRUSTED_IPS_MAX, type TrustedIpList } from 'pockethost/common'
  import { onMount } from 'svelte'

  let trustedIps: TrustedIpList = []
  let newIp = ''
  let loading = true
  let saving = false
  let errorMessage = ''
  let successMessage = ''

  const loadTrustedIps = async () => {
    loading = true
    errorMessage = ''
    try {
      const { trusted_ips } = await client().getTrustedIps()
      trustedIps = trusted_ips
    } catch (error) {
      errorMessage = `${error}`
    } finally {
      loading = false
    }
  }

  onMount(() => {
    loadTrustedIps()
  })

  const saveTrustedIps = async (next: TrustedIpList) => {
    saving = true
    errorMessage = ''
    successMessage = ''
    try {
      const { trusted_ips } = await client().updateTrustedIps(next)
      trustedIps = trusted_ips
      successMessage = 'Trusted IPs saved.'
    } catch (error) {
      errorMessage = client()
        .parseError(error as Error)
        .join(' ')
    } finally {
      saving = false
    }
  }

  const addIp = async () => {
    const value = newIp.trim()
    if (!value) return
    newIp = ''
    await saveTrustedIps([...trustedIps, value])
  }

  const removeIp = async (ip: string) => {
    await saveTrustedIps(trustedIps.filter((entry) => entry !== ip))
  }
</script>

<FeatureTab title="Trusted IPs" documentation="/docs/limits" bind:errorMessage {successMessage} successFlash>
  <svelte:fragment slot="summary">
    <p>
      Add IP addresses you trust for higher rate limits on your instances. If you proxy requests from a server (SSR),
      send the real client IP in the <code class="text-sm">X-PocketHost-Client-IP</code> header so each user gets their own
      limit bucket. Changes apply on the firewall within seconds after you save.
    </p>
  </svelte:fragment>

  <svelte:fragment slot="cta">
    {#if !loading && trustedIps.length === 0}
      <wa-callout variant="neutral" class="wa-callout-padded wa-callout-subtle-border">
        <wa-icon slot="icon" name="shield-halved"></wa-icon>
        No trusted IPs yet. Add a server or office egress address if you hit shared-IP rate limits.
      </wa-callout>
    {/if}
  </svelte:fragment>

  {#if loading}
    <div class="flex items-center gap-3 text-white/60 py-8">
      <wa-icon name="spinner" class="animate-spin"></wa-icon>
      <span>Loading trusted IPs…</span>
    </div>
  {:else}
    <div class="max-w-form space-y-6">
      <div class="auth-field-group">
        <label class="auth-label" for="trustedIp">Add IP or CIDR</label>
        <div class="flex flex-col sm:flex-row gap-3">
          <wa-input
            id="trustedIp"
            placeholder="203.0.113.5 or 198.51.100.0/24"
            value={newIp}
            oninput={(e: Event) => (newIp = (e.currentTarget as HTMLInputElement).value)}
            class="flex-1 w-full"
          ></wa-input>
          <wa-button variant="brand" onclick={addIp} disabled={saving || !newIp.trim()}>
            {saving ? 'Saving…' : 'Add'}
          </wa-button>
        </div>
        <p class="text-sm text-neutral-400 mt-2">
          Up to {TRUSTED_IPS_MAX} entries per account. Applies to all instances. For conferences and unpredictable egress,
          see <a href="/docs/limits#events-and-conferences" class="account-stat-link">Events and conferences</a>.
        </p>
      </div>

      {#if trustedIps.length > 0}
        <ul class="space-y-2">
          {#each trustedIps as ip (ip)}
            <li class="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <code class="text-sm text-white break-all">{ip}</code>
              <wa-button variant="danger" appearance="plain" onclick={() => removeIp(ip)} disabled={saving}>
                Remove
              </wa-button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}
</FeatureTab>
