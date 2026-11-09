<script lang="ts">
  import ApiTokenCreateForm from '$components/ApiTokenCreateForm.svelte'
  import CopyField from '$components/CopyField.svelte'
  import FeatureTab from '$components/FeatureTab.svelte'
  import { tokenAccessLabel, tokenExpiryLabel, tokenLastUsedLabel, tokenScopeLabel } from '$lib/tokens/apiTokenLabels'
  import { client } from '$src/pocketbase-client'
  import { globalInstancesStore } from '$util/stores'
  import { API_TOKEN_COLLECTION, patDisplay, type ApiTokenFields } from '@pockethost/server/common'
  import { onMount } from 'svelte'

  let tokens: ApiTokenFields[] = []
  let loading = true
  let errorMessage = ''
  let successMessage = ''
  let showCreateForm = false
  let created: { token: string; label: string } | null = null
  let confirmRevokeId = ''
  let editingId = ''

  const loadTokens = async () => {
    loading = true
    errorMessage = ''
    try {
      tokens = await client().client.collection(API_TOKEN_COLLECTION).getFullList<ApiTokenFields>({ sort: '-created' })
    } catch (error) {
      errorMessage = `${error}`
    } finally {
      loading = false
    }
  }

  onMount(() => {
    loadTokens()
  })

  const handleCreated = async (e: CustomEvent<{ token: string; label: string }>) => {
    created = e.detail
    showCreateForm = false
    successMessage = ''
    await loadTokens()
  }

  const startEdit = (id: string) => {
    errorMessage = ''
    successMessage = ''
    confirmRevokeId = ''
    showCreateForm = false
    editingId = id
  }

  const handleUpdated = async (e: CustomEvent<{ label: string }>) => {
    editingId = ''
    successMessage = `Token "${e.detail.label}" updated.`
    await loadTokens()
  }

  const revoke = async (id: string) => {
    errorMessage = ''
    try {
      await client().client.collection(API_TOKEN_COLLECTION).delete(id)
      successMessage = 'Token revoked.'
      confirmRevokeId = ''
      await loadTokens()
    } catch (error) {
      errorMessage = `${error}`
    }
  }
</script>

<FeatureTab title="API Tokens" documentation="/docs/deploy-from-ci" bind:errorMessage {successMessage} successFlash>
  <svelte:fragment slot="summary">
    <p>
      The <code>pockethost</code> CLI signs in with a personal access token, on your computer and in CI. Give each token only
      the instances it needs, and revoke it here if it leaks.
    </p>
  </svelte:fragment>

  <svelte:fragment slot="cta">
    {#if !loading && tokens.length === 0 && !created}
      <wa-callout variant="neutral" class="wa-callout-padded wa-callout-subtle-border">
        <wa-icon slot="icon" name="key"></wa-icon>
        No tokens yet. Create one to deploy from GitHub Actions or another CI.
      </wa-callout>
    {/if}
  </svelte:fragment>

  {#if created}
    <wa-callout variant="success" class="wa-callout-padded mb-6">
      <wa-icon slot="icon" name="circle-check"></wa-icon>
      <div class="space-y-3">
        <p class="font-semibold">Token "{created.label}" created. Copy it now: you won't see it again.</p>
        <CopyField text={created.token} />
        <p class="text-sm text-white/70">
          Paste it into <code>pockethost login</code> on your machine, or save it as a CI secret named
          <code>POCKETHOST_TOKEN</code>.
        </p>
        <wa-button size="s" appearance="outline" onclick={() => (created = null)}>Done</wa-button>
      </div>
    </wa-callout>
  {/if}

  {#if loading}
    <div class="flex items-center gap-3 text-white/60 py-8">
      <wa-icon name="spinner" class="animate-spin"></wa-icon>
      <span>Loading tokens…</span>
    </div>
  {:else if tokens.length > 0}
    <div class="mb-8 space-y-3">
      {#each tokens as token (token.id)}
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
              <span class="font-semibold text-white">{token.label}</span>
              <wa-badge variant="neutral" pill>{tokenAccessLabel(token)}</wa-badge>
              <wa-badge variant="neutral" pill>{tokenScopeLabel(token, $globalInstancesStore)}</wa-badge>
            </div>
            <p class="font-mono text-xs text-white/45 truncate">
              {patDisplay(token.hint)} · {tokenLastUsedLabel(token.last_used)} · {tokenExpiryLabel(token.expires)}
            </p>
          </div>
          {#if confirmRevokeId === token.id}
            <div class="flex shrink-0 gap-2">
              <wa-button variant="danger" size="s" onclick={() => revoke(token.id)}>Revoke</wa-button>
              <wa-button variant="neutral" size="s" appearance="plain" onclick={() => (confirmRevokeId = '')}>
                Cancel
              </wa-button>
            </div>
          {:else}
            <div class="flex shrink-0 gap-2 sm:opacity-70 sm:group-hover:opacity-100">
              <wa-button
                variant="neutral"
                size="s"
                appearance="outline"
                onclick={() => (editingId === token.id ? (editingId = '') : startEdit(token.id))}
              >
                <wa-icon slot="start" name="pen"></wa-icon>
                Edit
              </wa-button>
              <wa-button variant="danger" size="s" appearance="outline" onclick={() => (confirmRevokeId = token.id)}>
                <wa-icon slot="start" name="trash"></wa-icon>
                Revoke
              </wa-button>
            </div>
          {/if}
        </div>
        {#if editingId === token.id}
          <div>
            <ApiTokenCreateForm {token} bind:errorMessage on:updated={handleUpdated} />
            <div class="mt-3">
              <wa-button variant="neutral" appearance="plain" onclick={() => (editingId = '')}>Cancel</wa-button>
            </div>
          </div>
        {/if}
      {/each}
    </div>
  {/if}

  {#if !loading}
    {#if showCreateForm}
      <ApiTokenCreateForm bind:errorMessage on:created={handleCreated} />
      <div class="mt-3">
        <wa-button variant="neutral" appearance="plain" onclick={() => (showCreateForm = false)}> Cancel </wa-button>
      </div>
    {:else}
      <wa-button
        variant="brand"
        onclick={() => {
          editingId = ''
          showCreateForm = true
        }}
      >
        <wa-icon slot="start" name="plus"></wa-icon>
        Create token
      </wa-button>
    {/if}
  {/if}
</FeatureTab>
