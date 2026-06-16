<script lang="ts">
  import CodeSample from '$components/CodeSample.svelte'
  import FeatureTab from '$components/FeatureTab.svelte'
  import SshKeyAddForm from '$components/SshKeyAddForm.svelte'
  import { sshKeysForInstance } from '$lib/ssh/instanceAccess'
  import { sshKeyScopeLabel } from '$lib/ssh/sshKeyScopeLabel'
  import { FTP_HOST, SFTP_COMMAND, SFTP_PORT } from '$lib/appEnv'
  import { client } from '$src/pocketbase-client'
  import { globalInstancesStore } from '$util/stores'
  import { SSH_KEY_COLLECTION, type SshKeyFields } from 'pockethost/common'
  import { instance } from '../store'
  import { bash } from 'svelte-highlight/languages'
  import { onMount } from 'svelte'

  const { user } = client()
  const email = user()?.email

  if (!email) {
    throw new Error(`Email expected here`)
  }

  const sftpCommand = SFTP_COMMAND(email)

  let keys: SshKeyFields[] = []
  let loading = true
  let errorMessage = ''
  let successMessage = ''
  let showAddForm = false

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

  $: instanceKeys = sshKeysForInstance(keys, $instance.id)

  const handleKeySaved = async () => {
    successMessage = instanceKeys.length === 0 ? 'SSH key saved. You can connect below.' : 'SSH key saved.'
    showAddForm = false
    await loadKeys()
  }

  const scopeLabel = (key: SshKeyFields) => sshKeyScopeLabel(key, $globalInstancesStore)

  const shortFingerprint = (fp: string) => {
    if (fp.length <= 28) return fp
    return `${fp.slice(0, 16)}…${fp.slice(-8)}`
  }
</script>

{#if loading}
  <FeatureTab title="SFTP File Access" documentation="/docs/ftp">
    <div class="flex items-center gap-3 text-white/60 py-8">
      <wa-icon name="spinner" class="animate-spin"></wa-icon>
      <span>Loading…</span>
    </div>
  </FeatureTab>
{:else}
  <FeatureTab title="SFTP File Access" documentation="/docs/ftp" bind:errorMessage {successMessage} successFlash>
    <svelte:fragment slot="summary">
      {#if instanceKeys.length === 0}
        <p>
          No SSH key on your account can access <strong>{$instance.subdomain}</strong> yet. Generate a key on your machine,
          add one with access to this instance, then connect from the command below.
        </p>
      {:else}
        <p>
          Access instance files over SFTP with an Ed25519 key from
          <a href="/account/keys" class="text-primary">Account → Keys</a>. After connecting, run
          <code>cd {$instance.subdomain}</code> to open this instance.
        </p>
      {/if}
    </svelte:fragment>

    <svelte:fragment slot="cta">
      {#if instanceKeys.length === 0}
        <wa-callout variant="neutral" class="wa-callout-padded wa-callout-subtle-border">
          <wa-icon slot="icon" name="key"></wa-icon>
          Add an SSH key with access to this instance to connect over SFTP.
        </wa-callout>
      {/if}
    </svelte:fragment>

    {#if instanceKeys.length > 0}
      <div class="mb-6">
        <p class="text-xs font-medium uppercase tracking-wide text-white/50 mb-3">Connection</p>
        <table class="table table-sm w-full">
          <tbody>
            <tr>
              <th>Server</th>
              <td class="font-mono">{FTP_HOST}</td>
            </tr>
            <tr>
              <th>Port</th>
              <td class="font-mono">{SFTP_PORT}</td>
            </tr>
            <tr>
              <th>Username</th>
              <td class="font-mono">{email}</td>
            </tr>
            <tr>
              <th>Protocol</th>
              <td>SFTP</td>
            </tr>
            <tr>
              <th>Authentication</th>
              <td>Ed25519 SSH private key</td>
            </tr>
            <tr>
              <th>Instance folder</th>
              <td class="font-mono">{$instance.subdomain}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mb-6">
        <p class="text-xs font-medium uppercase tracking-wide text-white/50 mb-3">CLI Sample</p>
        <CodeSample code={sftpCommand} language={bash} className="" />
        <p class="text-sm text-white/60 mt-3">
          For Windows and other clients, consult
          <a href="/docs/ftp" class="text-primary hover:underline">full documentation</a>.
        </p>
      </div>

      <div class="mb-4 space-y-3">
        <p class="text-xs font-medium uppercase tracking-wide text-white/50">Keys for this instance</p>
        {#each instanceKeys as key (key.id)}
          <div
            class="flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 md:p-5"
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
          </div>
        {/each}
      </div>
    {/if}

    {#if showAddForm}
      <SshKeyAddForm
        idPrefix="sftp"
        initialInstanceId={$instance.id}
        existingKeys={keys}
        showKeygenHelp
        bind:errorMessage
        on:saved={handleKeySaved}
      />
      <div class="mt-3 mb-8">
        <wa-button variant="neutral" appearance="plain" onclick={() => (showAddForm = false)}> Cancel </wa-button>
      </div>
    {:else}
      <div class="mb-8">
        <wa-button variant="brand" onclick={() => (showAddForm = true)}>
          <wa-icon slot="start" name="plus"></wa-icon>
          Add
        </wa-button>
      </div>
    {/if}
  </FeatureTab>
{/if}
