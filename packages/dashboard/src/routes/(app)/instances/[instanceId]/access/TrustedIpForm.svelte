<script lang="ts">
  import AlertBar from '$components/AlertBar.svelte'
  import { client } from '$src/pocketbase-client'
  import { normalizeCidr } from 'pockethost/common'
  import { instance } from '../store'
  import { trustedItems } from './stores'
  import { faFloppyDisk } from '@fortawesome/free-solid-svg-icons'
  import Fa from 'svelte-fa'

  let cidr = ''
  let label = ''
  let errorMessage = ''
  let successfulSave = false
  let isFormValid = false

  $: {
    const normalized = normalizeCidr(cidr.trim())
    isFormValid = !!normalized
  }

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    errorMessage = ''

    const normalized = normalizeCidr(cidr.trim())
    if (!normalized) {
      errorMessage = 'Enter a valid IP address or CIDR range.'
      return
    }

    try {
      isFormValid = false
      trustedItems.upsert({ cidr: normalized, ...(label.trim() ? { label: label.trim() } : {}) })
      await client().updateInstance({
        id: $instance.id,
        fields: { trusted_ips: $trustedItems },
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
      isFormValid = true
    }
  }
</script>

<h3 class="text-xl mb-4">Add Trusted IP</h3>

{#if successfulSave}
  <AlertBar message="Trusted IP saved." type="success" />
{/if}

<AlertBar message={errorMessage} type="error" />

<form on:submit={handleSubmit} class="mb-8">
  <div class="flex flex-col md:flex-row gap-2 mb-2">
    <label class="flex-1 form-control">
      <input
        type="text"
        bind:value={cidr}
        placeholder="203.0.113.10 or 203.0.113.0/24"
        class={`input input-bordered ${!isFormValid && cidr.length > 0 ? 'input-error' : ''}`}
      />
    </label>
    <label class="flex-1 form-control">
      <input type="text" bind:value={label} placeholder="Optional label (e.g. Office NAT)" class="input input-bordered" />
    </label>
    <div class="flex-none">
      <button type="submit" class="btn btn-primary" disabled={!isFormValid}>
        Add <Fa icon={faFloppyDisk} />
      </button>
    </div>
  </div>
</form>
