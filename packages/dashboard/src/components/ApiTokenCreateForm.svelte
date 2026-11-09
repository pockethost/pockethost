<script lang="ts">
  import { DEFAULT_EXPIRY_DAYS, EXPIRY_OPTIONS, expiryFromDays, sortBySubdomain } from '$lib/tokens/apiTokenLabels'
  import { client } from '$src/pocketbase-client'
  import { globalInstancesStore } from '$util/stores'
  import type { ApiTokenFields, InstanceFields } from '@pockethost/server/common'
  import { createEventDispatcher } from 'svelte'

  export let errorMessage = ''
  /** When set, the form edits this token's instances only (the secret, name, access and expiry don't change). */
  export let token: ApiTokenFields | null = null

  const dispatch = createEventDispatcher<{ created: { token: string; label: string }; updated: { label: string } }>()

  let label = ''
  let canDeploy = true
  let allInstances = token ? !!token.all_instances : true
  let selectedInstanceIds: string[] = token ? [...(token.instances ?? [])] : []
  let expiryDays: number = DEFAULT_EXPIRY_DAYS
  let saving = false

  const instanceOptions = (): InstanceFields[] => sortBySubdomain(Object.values($globalInstancesStore))

  const toggleInstance = (id: string) => {
    selectedInstanceIds = selectedInstanceIds.includes(id)
      ? selectedInstanceIds.filter((value) => value !== id)
      : [...selectedInstanceIds, id]
  }

  const save = async () => {
    if (!token) return
    errorMessage = ''
    // Drop ids that are no longer on the account (deleted instances), so they don't block saving.
    const ids = selectedInstanceIds.filter((id) => !!$globalInstancesStore[id])
    if (!allInstances && ids.length === 0) {
      errorMessage = 'Select at least one instance or choose all instances.'
      return
    }
    saving = true
    try {
      await client().client.send(`/api/tokens/${token.id}`, {
        method: 'PATCH',
        body: { all_instances: allInstances, instances: allInstances ? [] : ids },
      })
      dispatch('updated', { label: token.label })
    } catch (error) {
      const e = error as { response?: { message?: string } }
      errorMessage = e.response?.message || `${error}`
    } finally {
      saving = false
    }
  }

  const create = async () => {
    errorMessage = ''
    if (!label.trim()) {
      errorMessage = 'Name is required.'
      return
    }
    if (!allInstances && selectedInstanceIds.length === 0) {
      errorMessage = 'Select at least one instance or choose all instances.'
      return
    }
    saving = true
    try {
      const res = await client().client.send<{ token: string }>(`/api/tokens`, {
        method: 'POST',
        body: {
          label: label.trim(),
          scopes: canDeploy ? ['read', 'write'] : ['read'],
          all_instances: allInstances,
          instances: allInstances ? [] : selectedInstanceIds,
          expires: expiryFromDays(expiryDays),
        },
      })
      dispatch('created', { token: res.token, label: label.trim() })
      label = ''
      selectedInstanceIds = []
      allInstances = true
      canDeploy = true
      expiryDays = DEFAULT_EXPIRY_DAYS
    } catch (error) {
      const e = error as { response?: { message?: string } }
      errorMessage = e.response?.message || `${error}`
    } finally {
      saving = false
    }
  }
</script>

<wa-card class="border border-white/10 bg-[#111111]/60 overflow-hidden">
  <div class="wa-card-header">
    <h3 class="text-base font-semibold text-white">{token ? `Edit "${token.label}"` : 'Create token'}</h3>
  </div>

  <div class="wa-card-section wa-card-section--lg wa-stack-lg">
    {#if token}
      <p class="text-sm text-white/60">
        Change which instances this token can reach. The token itself stays the same, so CI secrets keep working.
      </p>
    {:else}
      <div class="field">
        <label class="field-label" for="token-label">Name</label>
        <wa-input
          id="token-label"
          value={label}
          oninput={(e: Event) => (label = (e.currentTarget as HTMLInputElement).value)}
          placeholder="GitHub Actions, laptop, …"
        ></wa-input>
      </div>

      <div class="field">
        <span class="field-label">Access</span>
        <div class="segmented segmented-compact">
          <button
            type="button"
            class="segmented-item"
            class:segmented-item-active={canDeploy}
            onclick={() => (canDeploy = true)}
          >
            Deploy + read
          </button>
          <button
            type="button"
            class="segmented-item"
            class:segmented-item-active={!canDeploy}
            onclick={() => (canDeploy = false)}
          >
            Read only
          </button>
        </div>
      </div>
    {/if}

    <div class="field">
      <span class="field-label">Instances</span>
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

    {#if !token}
      <div class="field">
        <span class="field-label">Expiry</span>
        <div class="segmented segmented-compact">
          {#each EXPIRY_OPTIONS as option (option.days)}
            <button
              type="button"
              class="segmented-item"
              class:segmented-item-active={expiryDays === option.days}
              onclick={() => (expiryDays = option.days)}
            >
              {option.label}
            </button>
          {/each}
        </div>
      </div>
    {/if}

    <div class="pt-2 flex flex-wrap gap-3">
      {#if token}
        <wa-button variant="brand" onclick={save} disabled={saving}>
          <wa-icon slot="start" name="check"></wa-icon>
          {saving ? 'Saving…' : 'Save changes'}
        </wa-button>
      {:else}
        <wa-button variant="brand" onclick={create} disabled={saving}>
          <wa-icon slot="start" name="plus"></wa-icon>
          {saving ? 'Creating…' : 'Create token'}
        </wa-button>
      {/if}
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
    max-width: 32rem;
  }

  .segmented-item {
    display: inline-flex;
    align-items: center;
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
    white-space: nowrap;
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
