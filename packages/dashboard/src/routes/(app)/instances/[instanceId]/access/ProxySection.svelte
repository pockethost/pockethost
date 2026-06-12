<script lang="ts">
  import AlertBar from '$components/AlertBar.svelte'
  import CodeSample from '$components/CodeSample.svelte'
  import { client } from '$src/pocketbase-client'
  import { isUserPaid } from '$util/stores'
  import { normalizeCidr } from 'pockethost/common'
  import { instance } from '../store'
  import { proxyItems } from './stores'
  import { fade } from 'svelte/transition'
  import Fa from 'svelte-fa'
  import { faFloppyDisk, faTrash } from '@fortawesome/free-solid-svg-icons'

  let cidr = ''
  let label = ''
  let errorMessage = ''
  let successfulSave = false
  let isFormValid = false

  $: paid = $isUserPaid
  $: {
    const normalized = normalizeCidr(cidr.trim())
    isFormValid = !!normalized && paid
  }

  $: proxyCode = `// Forward the real client IP from your SSR/proxy server
fetch('https://${$instance.subdomain}.pockethost.io/api/collections/posts/records', {
  headers: {
    'X-PocketHost-Client-IP': clientIpFromRequest,
  },
})`

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    errorMessage = ''

    if (!paid) {
      errorMessage = 'SSR / proxy mode requires a Pro plan or higher.'
      return
    }

    const normalized = normalizeCidr(cidr.trim())
    if (!normalized) {
      errorMessage = 'Enter a valid IP address or CIDR range.'
      return
    }

    try {
      isFormValid = false
      proxyItems.upsert({ cidr: normalized, ...(label.trim() ? { label: label.trim() } : {}) })
      await client().updateInstance({
        id: $instance.id,
        fields: { proxy_ips: $proxyItems },
      })
      cidr = ''
      label = ''
      isFormValid = true
      successfulSave = true
      setTimeout(() => {
        successfulSave = false
      }, 5000)
    } catch (error: any) {
      errorMessage = error.message
      isFormValid = paid && !!normalizeCidr(cidr.trim())
    }
  }

  const handleDelete = (entryCidr: string) => async () => {
    proxyItems.delete(entryCidr)
    await client().updateInstance({
      id: $instance.id,
      fields: { proxy_ips: $proxyItems },
    })
  }
</script>

<h3 class="text-xl mb-2">SSR / Proxy Mode</h3>

<p class="mb-4">
  If your app server proxies PocketHost API calls (SSR, Next.js server actions, etc.), register its IP here. PocketHost
  will read the <code>X-PocketHost-Client-IP</code> header so each end user gets their own rate limit bucket instead of
  sharing your server's IP.
</p>

{#if !paid}
  <AlertBar
    message="SSR / proxy mode is available on Pro and above. Trusted IPs above work on all plans."
    type="warning"
  />
{/if}

<CodeSample code={proxyCode} />

{#if successfulSave}
  <AlertBar message="Proxy IP saved." type="success" />
{/if}

<AlertBar message={errorMessage} type="error" />

<form on:submit={handleSubmit} class="mb-6 mt-6">
  <div class="flex flex-col md:flex-row gap-2 mb-2">
    <label class="flex-1 form-control">
      <input
        type="text"
        bind:value={cidr}
        placeholder="203.0.113.10"
        class={`input input-bordered ${!isFormValid && cidr.length > 0 ? 'input-error' : ''}`}
        disabled={!paid}
      />
    </label>
    <label class="flex-1 form-control">
      <input
        type="text"
        bind:value={label}
        placeholder="Optional label (e.g. Vercel)"
        class="input input-bordered"
        disabled={!paid}
      />
    </label>
    <div class="flex-none">
      <button type="submit" class="btn btn-primary" disabled={!isFormValid}>
        Add <Fa icon={faFloppyDisk} />
      </button>
    </div>
  </div>
</form>

{#if $proxyItems.length > 0}
  <table class="table mb-8">
    <thead>
      <tr>
        <th class="border-b-2 border-neutral">Proxy IP / CIDR</th>
        <th class="border-b-2 border-neutral">Label</th>
        <th class="border-b-2 border-neutral text-right">Actions</th>
      </tr>
    </thead>
    <tbody>
      {#each $proxyItems as item}
        <tr transition:fade>
          <td><code>{item.cidr}</code></td>
          <td>{item.label || '—'}</td>
          <td class="text-right">
            <button
              aria-label="Delete"
              on:click={handleDelete(item.cidr)}
              type="button"
              class="btn btn-sm btn-square btn-outline btn-warning"
            >
              <Fa icon={faTrash} />
            </button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}

<style>
  :global(code) {
    background-color: #565656;
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    font-family: ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace;
    font-size: 0.875em;
  }
</style>
