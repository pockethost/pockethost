<script lang="ts">
  import FeatureTab from '$components/FeatureTab.svelte'
  import SshKeyAddForm from '$components/SshKeyAddForm.svelte'
  import { sshKeyScopeLabel } from '$lib/ssh/sshKeyScopeLabel'
  import { client } from '$src/pocketbase-client'
  import { globalInstancesStore } from '$util/stores'
  import { SSH_KEY_COLLECTION, type SshKeyFields } from 'pockethost/common'
  import { onMount } from 'svelte'

  let keys: SshKeyFields[] = []
  let loading = true
  let errorMessage = ''
  let successMessage = ''
  let showCreateForm = false

  const loadKeys = async () => {
    loading = true
    errorMessage = ''
    try {
      keys = await client().client.collection(SSH_KEY_COLLECTION).getFullList<SshKeyFields>({ sort: '-created' })
    } catch (error) {
      errorMessage = `${error}`
    } finally {
      loading = false
    }
  }

  onMount(() => {
    loadKeys()
  })

  const handleKeySaved = async () => {
    successMessage = 'SSH key saved.'
    showCreateForm = false
    await loadKeys()
  }

  const deleteKey = async (id: string) => {
    errorMessage = ''
    try {
      await client().client.collection(SSH_KEY_COLLECTION).delete(id)
      successMessage = 'SSH key removed.'
      await loadKeys()
    } catch (error) {
      errorMessage = `${error}`
    }
  }

  const scopeLabel = (key: SshKeyFields) => sshKeyScopeLabel(key, $globalInstancesStore)

  const shortFingerprint = (fp: string) => {
    if (fp.length <= 28) return fp
    return `${fp.slice(0, 16)}…${fp.slice(-8)}`
  }
</script>

<FeatureTab title="SFTP SSH Keys" documentation="/docs/ftp" bind:errorMessage {successMessage} successFlash>
  <svelte:fragment slot="summary">
    <p>
      SFTP uses Ed25519 keys only. Username is your PocketHost email. Generate a key on your machine, then add it here.
      PocketHost stores the public key only, like GitHub.
    </p>
  </svelte:fragment>

  <svelte:fragment slot="cta">
    {#if !loading && keys.length === 0}
      <wa-callout variant="neutral" class="wa-callout-padded wa-callout-subtle-border">
        <wa-icon slot="icon" name="key"></wa-icon>
        No SSH keys yet. Add one to connect over SFTP.
      </wa-callout>
    {/if}
  </svelte:fragment>

  {#if loading}
    <div class="flex items-center gap-3 text-white/60 py-8">
      <wa-icon name="spinner" class="animate-spin"></wa-icon>
      <span>Loading keys…</span>
    </div>
  {:else if keys.length > 0}
    <div class="mb-8 space-y-3">
      {#each keys as key (key.id)}
        <div
          class="group flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 md:p-5 hover:border-white/20 transition-colors"
        >
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary"
            aria-hidden="true"
          >
            <wa-icon name="key"></wa-icon>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2 mb-1">
              <span class="font-semibold text-white">{key.label}</span>
              <wa-badge variant="neutral" pill>{scopeLabel(key)}</wa-badge>
            </div>
            <p class="font-mono text-xs text-white/45 truncate" title={key.fingerprint}>
              {shortFingerprint(key.fingerprint)}
            </p>
          </div>
          <wa-button
            variant="danger"
            size="small"
            appearance="outline"
            class="shrink-0 sm:opacity-70 sm:group-hover:opacity-100"
            onclick={() => deleteKey(key.id)}
          >
            <wa-icon slot="start" name="trash"></wa-icon>
            Remove
          </wa-button>
        </div>
      {/each}
    </div>
  {/if}

  {#if !loading}
    {#if showCreateForm}
      <SshKeyAddForm
        idPrefix="account"
        existingKeys={keys}
        showKeygenHelp
        bind:errorMessage
        on:saved={handleKeySaved}
      />
      <div class="mt-3">
        <wa-button variant="neutral" appearance="plain" onclick={() => (showCreateForm = false)}> Cancel </wa-button>
      </div>
    {:else}
      <wa-button variant="brand" onclick={() => (showCreateForm = true)}>
        <wa-icon slot="start" name="plus"></wa-icon>
        Add
      </wa-button>
    {/if}
  {/if}
</FeatureTab>
