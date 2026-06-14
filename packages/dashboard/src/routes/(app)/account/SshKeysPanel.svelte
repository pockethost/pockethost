<script lang="ts">
  import AlertBar from '$components/AlertBar.svelte'
  import CopyField from '$components/CopyField.svelte'
  import { client } from '$src/pocketbase-client'
  import { fingerprintForPublicKeyInput, parseSshEd25519PublicKey } from '$lib/ssh/ed25519PublicKey'
  import { globalInstancesStore, userStore } from '$util/stores'
  import { SSH_KEY_COLLECTION, type InstanceFields, type SshKeyFields } from 'pockethost/common'
  import { onMount } from 'svelte'

  let keys: SshKeyFields[] = []
  let loading = true
  let errorMessage = ''
  let successMessage = ''

  let label = ''
  let publicKeyInput = ''
  let allInstances = true
  let selectedInstanceIds: string[] = []

  const resetForm = () => {
    label = ''
    publicKeyInput = ''
    allInstances = true
    selectedInstanceIds = []
  }

  const loadKeys = async () => {
    loading = true
    errorMessage = ''
    try {
      keys = await client()
        .client.collection(SSH_KEY_COLLECTION)
        .getFullList<SshKeyFields>({ sort: '-created' })
    } catch (error) {
      errorMessage = `${error}`
    } finally {
      loading = false
    }
  }

  onMount(() => {
    loadKeys()
  })

  const instanceOptions = (): InstanceFields[] => Object.values($globalInstancesStore)

  const toggleInstance = (id: string) => {
    if (selectedInstanceIds.includes(id)) {
      selectedInstanceIds = selectedInstanceIds.filter((value) => value !== id)
    } else {
      selectedInstanceIds = [...selectedInstanceIds, id]
    }
  }

  const saveKey = async () => {
    errorMessage = ''
    successMessage = ''

    if (!label.trim()) {
      errorMessage = 'Label is required.'
      return
    }

    if (!publicKeyInput.trim()) {
      errorMessage = 'Paste your ssh-ed25519 public key.'
      return
    }

    if (!allInstances && selectedInstanceIds.length === 0) {
      errorMessage = 'Select at least one instance or choose all instances.'
      return
    }

    let fingerprint = ''
    let publicKey = ''
    try {
      const parsed = parseSshEd25519PublicKey(publicKeyInput)
      publicKey = parsed.normalized
      fingerprint = await fingerprintForPublicKeyInput(publicKey)
    } catch (error) {
      errorMessage = `${error}`
      return
    }

    try {
      await client().client.collection(SSH_KEY_COLLECTION).create({
        label: label.trim(),
        public_key: publicKey,
        fingerprint,
        all_instances: allInstances,
        instances: allInstances ? [] : selectedInstanceIds,
        user: $userStore?.id,
      })

      successMessage = 'SSH key saved.'
      resetForm()
      await loadKeys()
    } catch (error) {
      errorMessage = client().parseError(error as Error).join(' ') || `${error}`
    }
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

  const scopeLabel = (key: SshKeyFields) => {
    if (key.all_instances) return 'All instances'
    const count = key.instances?.length ?? 0
    return count === 1 ? '1 instance' : `${count} instances`
  }

  const shortFingerprint = (fp: string) => {
    if (fp.length <= 28) return fp
    return `${fp.slice(0, 16)}…${fp.slice(-8)}`
  }

  const sshKeygenCommand = () => {
    const email = $userStore?.email ?? 'you@example.com'
    const comment = email.replace(/"/g, '\\"')
    return `ssh-keygen -t ed25519 -f ~/.ssh/pockethost_ed25519 -C "${comment}"`
  }

  $: keygenCommand = sshKeygenCommand()
</script>

<p class="text-white/70 text-sm mb-6 max-w-prose leading-relaxed">
  SFTP uses Ed25519 keys only. Username is your PocketHost email. Generate a key on your machine with
  <code class="key-inline">ssh-keygen</code>, then paste the public key here. PocketHost stores the public key only,
  like GitHub.
</p>

<AlertBar message={errorMessage} type="error" />
<AlertBar message={successMessage} type="success" flash />

{#if loading}
  <div class="flex items-center gap-3 text-white/60 py-8">
    <wa-icon name="spinner" class="animate-spin"></wa-icon>
    <span>Loading keys…</span>
  </div>
{:else if keys.length === 0}
  <wa-callout variant="neutral" class="mb-8 border border-white/10">
    <wa-icon slot="icon" name="key"></wa-icon>
    No SSH keys yet. Add one below to connect over SFTP.
  </wa-callout>
{:else}
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
          <p class="font-mono text-xs text-white/45 truncate" title={key.fingerprint}>{shortFingerprint(key.fingerprint)}</p>
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

<wa-card class="border border-white/10 bg-[#111111]/60 overflow-hidden">
  <div class="px-5 py-4 border-b border-white/10 bg-white/[0.02]">
    <h3 class="text-base font-semibold text-white">Add SSH key</h3>
  </div>

  <div class="p-5 md:p-6 space-y-6">
    <div class="field">
      <label class="field-label" for="ssh-key-label">Title</label>
      <wa-input
        id="ssh-key-label"
        value={label}
        oninput={(e) => (label = e.currentTarget.value)}
        placeholder="MacBook, GitHub Actions, …"
      ></wa-input>
    </div>

    <div class="field">
      <label class="field-label" for="ssh-public-key">Key</label>
      <textarea
        id="ssh-public-key"
        class="field-textarea font-mono text-xs"
        bind:value={publicKeyInput}
        placeholder="ssh-ed25519 AAAA… comment"
        rows="4"
      ></textarea>
      <p class="text-sm text-white/50 leading-relaxed">
        Generate a key locally, then paste the <code class="key-inline">.pub</code> file:
      </p>
      <CopyField text={keygenCommand} />
      <p class="text-sm text-white/50">
        macOS and Linux. On Windows or other setups, see
        <a href="/docs/ftp" class="text-primary hover:underline">SFTP File Access</a>.
      </p>
    </div>

    <div class="field">
      <span class="field-label">Instance access</span>
      <div class="segmented segmented-compact mb-3">
        <button
          type="button"
          class="segmented-item"
          class:segmented-item-active={allInstances}
          onclick={() => (allInstances = true)}
        >
          All instances
        </button>
        <button
          type="button"
          class="segmented-item"
          class:segmented-item-active={!allInstances}
          onclick={() => (allInstances = false)}
        >
          Specific instances
        </button>
      </div>

      {#if !allInstances}
        <div class="instance-grid">
          {#each instanceOptions() as instance (instance.id)}
            <label class="instance-option">
              <input
                type="checkbox"
                class="instance-checkbox"
                checked={selectedInstanceIds.includes(instance.id)}
                onchange={() => toggleInstance(instance.id)}
              />
              <span>{instance.subdomain}</span>
            </label>
          {:else}
            <p class="text-sm text-white/50 col-span-full py-2">No instances on your account yet.</p>
          {/each}
        </div>
      {/if}
    </div>

    <div class="pt-2 flex flex-wrap gap-3">
      <wa-button variant="brand" onclick={saveKey}>
        <wa-icon slot="start" name="floppy-disk"></wa-icon>
        Add SSH key
      </wa-button>
    </div>
  </div>
</wa-card>

<style>
  .key-inline {
    background-color: rgb(255 255 255 / 0.08);
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-family: ui-monospace, SFMono-Regular, 'SF Mono', Consolas, monospace;
    font-size: 0.8125em;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .field-label {
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: rgb(255 255 255 / 0.5);
  }

  .field-textarea {
    width: 100%;
    border-radius: 0.5rem;
    border: 1px solid rgb(255 255 255 / 0.12);
    background: rgb(0 0 0 / 0.35);
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
    color: white;
    resize: vertical;
  }

  .field-textarea:focus {
    outline: none;
    border-color: rgb(30 184 84 / 0.5);
    box-shadow: 0 0 0 2px rgb(30 184 84 / 0.15);
  }

  .segmented {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    padding: 0.25rem;
    border-radius: 0.625rem;
    border: 1px solid rgb(255 255 255 / 0.1);
    background: rgb(255 255 255 / 0.03);
  }

  .segmented-compact {
    display: flex;
    width: 100%;
    max-width: 24rem;
  }

  .segmented-item {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    justify-content: center;
    padding: 0.5rem 0.875rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: rgb(255 255 255 / 0.55);
    background: transparent;
    border: none;
    cursor: pointer;
    transition:
      background 0.15s,
      color 0.15s;
  }

  .segmented-item:hover {
    color: rgb(255 255 255 / 0.85);
    background: rgb(255 255 255 / 0.05);
  }

  .segmented-item-active {
    color: white;
    background: rgb(30 184 84 / 0.2);
    box-shadow: inset 0 0 0 1px rgb(30 184 84 / 0.35);
  }

  .instance-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
    gap: 0.5rem;
    padding: 0.75rem;
    border-radius: 0.5rem;
    border: 1px solid rgb(255 255 255 / 0.08);
    background: rgb(0 0 0 / 0.2);
    max-height: 12rem;
    overflow-y: auto;
  }

  .instance-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.625rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background 0.15s;
  }

  .instance-option:hover {
    background: rgb(255 255 255 / 0.05);
  }

  .instance-checkbox {
    accent-color: #1eb854;
    width: 1rem;
    height: 1rem;
  }
</style>
