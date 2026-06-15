<script lang="ts">
  import CopyField from '$components/CopyField.svelte'
  import { client } from '$src/pocketbase-client'
  import { fingerprintForPublicKeyInput, parseSshEd25519PublicKey } from '$lib/ssh/ed25519PublicKey'
  import {
    findDuplicateKey,
    formatSshKeySaveError,
    shouldGrantInstanceAccess,
  } from '$lib/ssh/sshKeySaveErrors'
  import { globalInstancesStore, userStore } from '$util/stores'
  import { SSH_KEY_COLLECTION, type InstanceFields, type SshKeyFields } from 'pockethost/common'
  import { createEventDispatcher } from 'svelte'
  import { bash } from 'svelte-highlight/languages'

  export let idPrefix = 'ssh'
  export let initialInstanceId: string | undefined = undefined
  export let existingKeys: SshKeyFields[] = []
  export let showKeygenHelp = false
  export let errorMessage = ''

  const dispatch = createEventDispatcher<{ saved: void }>()

  let label = ''
  let publicKeyInput = ''
  let allInstances = initialInstanceId === undefined
  let selectedInstanceIds: string[] = initialInstanceId ? [initialInstanceId] : []
  let saving = false
  let keyHelpOpen = false

  $: keygenCommand = (() => {
    const email = $userStore?.email ?? 'you@example.com'
    const comment = email.replace(/"/g, '\\"')
    return `ssh-keygen -t ed25519 -f ~/.ssh/pockethost_ed25519 -C "${comment}"`
  })()

  const showPubCommand = 'cat ~/.ssh/pockethost_ed25519.pub'

  const instanceOptions = (): InstanceFields[] => Object.values($globalInstancesStore)

  const toggleInstance = (id: string) => {
    if (selectedInstanceIds.includes(id)) {
      selectedInstanceIds = selectedInstanceIds.filter((value) => value !== id)
    } else {
      selectedInstanceIds = [...selectedInstanceIds, id]
    }
  }

  const resetForm = () => {
    label = ''
    publicKeyInput = ''
    allInstances = initialInstanceId === undefined
    selectedInstanceIds = initialInstanceId ? [initialInstanceId] : []
  }

  const saveKey = async () => {
    errorMessage = ''
    saving = true

    if (!label.trim()) {
      errorMessage = 'Label is required.'
      saving = false
      return
    }

    if (!publicKeyInput.trim()) {
      errorMessage = 'Paste your ssh-ed25519 public key.'
      saving = false
      return
    }

    if (!allInstances && selectedInstanceIds.length === 0) {
      errorMessage = 'Select at least one instance or choose all instances.'
      saving = false
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
      saving = false
      return
    }

    const duplicate = findDuplicateKey(existingKeys, fingerprint)
    if (duplicate) {
      if (shouldGrantInstanceAccess(duplicate, initialInstanceId)) {
        try {
          const instances = [...new Set([...(duplicate.instances ?? []), initialInstanceId])]
          await client().client.collection(SSH_KEY_COLLECTION).update(duplicate.id, {
            instances,
            all_instances: false,
          })
          resetForm()
          dispatch('saved')
        } catch (error) {
          errorMessage = formatSshKeySaveError(error, duplicate)
        } finally {
          saving = false
        }
        return
      }

      errorMessage = formatSshKeySaveError(null, duplicate)
      saving = false
      return
    }

    try {
      await client()
        .client.collection(SSH_KEY_COLLECTION)
        .create({
          label: label.trim(),
          public_key: publicKey,
          fingerprint,
          all_instances: allInstances,
          instances: allInstances ? [] : selectedInstanceIds,
          user: $userStore?.id,
        })

      resetForm()
      dispatch('saved')
    } catch (error) {
      errorMessage = formatSshKeySaveError(error)
    } finally {
      saving = false
    }
  }
</script>

<wa-card class="border border-white/10 bg-[#111111]/60 overflow-hidden">
  <div class="wa-card-header">
    <h3 class="text-base font-semibold text-white">Add SSH key</h3>
  </div>

  <div class="wa-card-section wa-card-section--lg wa-stack-lg">
    <div class="field">
      <label class="field-label" for="{idPrefix}-key-label">Title</label>
      <wa-input
        id="{idPrefix}-key-label"
        value={label}
        oninput={(e: Event) => (label = (e.currentTarget as HTMLInputElement).value)}
        placeholder="MacBook, GitHub Actions, …"
      ></wa-input>
    </div>

    <div class="field">
      <div class="field-label-row">
        <label class="field-label" for="{idPrefix}-public-key">Key</label>
        {#if showKeygenHelp}
          <button
            type="button"
            class="key-help-toggle"
            aria-expanded={keyHelpOpen}
            onclick={() => (keyHelpOpen = !keyHelpOpen)}
          >
            How?
          </button>
        {/if}
      </div>
      {#if showKeygenHelp && keyHelpOpen}
        <div class="key-help-panel">
          <CopyField text={keygenCommand} language={bash} embedded />
          <CopyField text={showPubCommand} language={bash} embedded />
          <p class="key-help-note">
            Copy the <code>ssh-ed25519 …</code> line from <code>cat</code> and paste it into the Key field below.
          </p>
        </div>
      {/if}
      <textarea
        id="{idPrefix}-public-key"
        class="field-textarea font-mono text-xs"
        bind:value={publicKeyInput}
        placeholder="ssh-ed25519 AAAA… comment"
        rows="4"
      ></textarea>
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
      <wa-button variant="brand" onclick={saveKey} disabled={saving}>
        <wa-icon slot="start" name="floppy-disk"></wa-icon>
        {saving ? 'Saving…' : 'Add SSH key'}
      </wa-button>
    </div>
  </div>
</wa-card>

<style>
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

  .field-label-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .field-label-row .field-label {
    margin: 0;
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

  .key-help-toggle {
    padding: 0;
    border: none;
    background: transparent;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #1eb854;
    cursor: pointer;
  }

  .key-help-toggle:hover {
    text-decoration: underline;
  }

  .key-help-panel {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .key-help-note {
    margin: 0;
    font-size: 0.8125rem;
    color: rgb(255 255 255 / 0.55);
    line-height: 1.5;
  }

  .key-help-note code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.75rem;
    color: rgb(255 255 255 / 0.75);
  }
</style>
