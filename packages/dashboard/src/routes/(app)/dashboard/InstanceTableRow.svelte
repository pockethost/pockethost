<script lang="ts">
  import { goto } from '$app/navigation'
  import { INSTANCE_ADMIN_URL, PUBLIC_APEX_DOMAIN } from '$lib/appEnv'
  import { client } from '$src/pocketbase-client'
  import InstanceRuntimeBadge from '$components/InstanceRuntimeBadge.svelte'
  import { patchGlobalInstance } from '$util/stores'
  import { isInstanceShuttingDown } from '$util/instancePower'
  import InstanceFavoriteButton from '$components/InstanceFavoriteButton.svelte'
  import Toggle from '../instances/[instanceId]/Toggle.svelte'
  import type { InstanceFields } from 'pockethost/common'

  export let instance: InstanceFields
  export let isFavorite = false
  export let onToggleFavorite: () => void = () => {}

  $: isShuttingDown = isInstanceShuttingDown(instance)
  $: displayName = instance.cname || instance.subdomain

  const { updateInstance } = client()

  const handlePowerChange = (power: boolean) => {
    patchGlobalInstance(instance.id, { power })

    updateInstance({ id: instance.id, fields: { power } }).catch(() => {
      patchGlobalInstance(instance.id, { power: !power })
    })
  }

  const openInstance = () => {
    goto(`/instances/${instance.id}`)
  }

  const onRowKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openInstance()
    }
  }
</script>

<tr class="instance-table-row" tabindex="0" role="link" onclick={openInstance} onkeydown={onRowKeydown}>
  <td class="instance-table-name" onclick={(e) => e.stopPropagation()}>
    <div class="instance-table-name-cell">
      <InstanceFavoriteButton {isFavorite} onToggle={onToggleFavorite} />
      <div class="instance-table-name-label">
        <button type="button" class="instance-table-name-link" onclick={openInstance}>
          <span class="instance-table-name-text">{displayName}</span>
          <span class="instance-table-sub">.{PUBLIC_APEX_DOMAIN}</span>
        </button>
      </div>
    </div>
  </td>
  <td class="instance-table-status">
    <InstanceRuntimeBadge {instance} />
  </td>
  <td class="instance-table-version">v{instance.version}</td>
  <td class="instance-table-admin">
    <a
      href={INSTANCE_ADMIN_URL(instance)}
      target="_blank"
      rel="noopener noreferrer"
      class="instance-table-admin-link"
      onclick={(e) => e.stopPropagation()}
    >
      Admin
    </a>
  </td>
  <td class="instance-table-power" onclick={(e) => e.stopPropagation()}>
    <Toggle checked={instance.power} loading={isShuttingDown} disabled={isShuttingDown} onChange={handlePowerChange} />
  </td>
</tr>

<style>
  .instance-table-row {
    cursor: pointer;
    transition: background-color 120ms ease;
  }

  .instance-table-row:hover,
  .instance-table-row:focus-visible {
    background: rgb(255 255 255 / 0.04);
    outline: none;
  }

  .instance-table-row:focus-visible {
    box-shadow: inset 0 0 0 2px rgb(255 255 255 / 0.15);
  }

  .instance-table-name {
    min-width: 12rem;
    max-width: 22rem;
  }

  .instance-table-name-cell {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    min-width: 0;
  }

  .instance-table-name-label {
    min-width: 0;
  }

  .instance-table-name-link {
    display: inline;
    padding: 0;
    border: none;
    background: transparent;
    font: inherit;
    text-align: left;
    cursor: pointer;
    min-width: 0;
  }

  .instance-table-name-text {
    font-weight: 600;
    color: #fff;
  }

  .instance-table-sub {
    margin-left: 0.125rem;
    font-size: 0.75rem;
    color: rgb(255 255 255 / 0.35);
  }

  .instance-table-status {
    white-space: nowrap;
  }

  .instance-table-version {
    font-size: 0.8125rem;
    color: rgb(255 255 255 / 0.55);
    white-space: nowrap;
  }

  .instance-table-admin-link {
    font-size: 0.8125rem;
    font-weight: 600;
    color: #1eb854;
    text-decoration: none;
  }

  .instance-table-admin-link:hover {
    text-decoration: underline;
  }

  .instance-table-power {
    width: 11rem;
    text-align: right;
  }
</style>
