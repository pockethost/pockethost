<script lang="ts">
  import { goto } from '$app/navigation'
  import { INSTANCE_ADMIN_URL, INSTANCE_URL, PUBLIC_APEX_DOMAIN } from '$lib/appEnv'
  import { client } from '$src/pocketbase-client'
  import InstanceRuntimeBadge from '$components/InstanceRuntimeBadge.svelte'
  import InstanceRegionBadge from '$components/InstanceRegionBadge.svelte'
  import { patchGlobalInstance } from '$util/stores'
  import { isInstanceShuttingDown, reportPowerChangeError } from '$util/instancePower'
  import InstanceFavoriteButton from '$components/InstanceFavoriteButton.svelte'
  import Toggle from '../instances/[instanceId]/Toggle.svelte'
  import type { InstanceFields } from '@pockethost/server/common'

  export let instance: InstanceFields
  export let isFavorite = false
  export let onToggleFavorite: () => void = () => {}

  $: isShuttingDown = isInstanceShuttingDown(instance)

  const { updateInstance } = client()

  const handlePowerChange = (power: boolean) => {
    patchGlobalInstance(instance.id, { power })

    updateInstance({ id: instance.id, fields: { power } }).catch((error) => {
      patchGlobalInstance(instance.id, { power: !power })
      reportPowerChangeError(error)
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
  <td class="instance-table-name">
    <div class="instance-table-name-cell">
      <InstanceFavoriteButton {isFavorite} onToggle={onToggleFavorite} />
      <!-- The domain opens the site in a new tab; the rest of the row opens the instance. -->
      <a
        href={INSTANCE_URL(instance)}
        target="_blank"
        rel="noopener noreferrer"
        class="instance-table-name-link"
        title="Open the site in a new tab"
        onclick={(e) => e.stopPropagation()}
      >
        {#if instance.cname}<span class="instance-table-name-text">{instance.cname}</span>{:else}<span
            class="instance-table-name-text">{instance.subdomain}</span
          ><span class="instance-table-sub">.{PUBLIC_APEX_DOMAIN}</span>{/if}
        <wa-icon name="arrow-up-right-from-square" class="instance-table-name-icon"></wa-icon>
      </a>
    </div>
  </td>
  <td class="instance-table-status">
    <InstanceRuntimeBadge {instance} />
  </td>
  <td class="instance-table-version">v{instance.version}</td>
  <td class="instance-table-region"><InstanceRegionBadge edge={instance.edge} /></td>
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

  .instance-table-name-link {
    display: inline-flex;
    align-items: baseline;
    min-width: 0;
    text-decoration: none;
  }

  .instance-table-name-link:hover .instance-table-name-text {
    text-decoration: underline;
  }

  .instance-table-name-icon {
    margin-left: 0.375rem;
    font-size: 0.6875rem;
    color: rgb(255 255 255 / 0.35);
    align-self: center;
  }

  .instance-table-name-link:hover .instance-table-name-icon {
    color: rgb(255 255 255 / 0.7);
  }

  .instance-table-name-text {
    font-weight: 600;
    color: #fff;
  }

  .instance-table-sub {
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

  .instance-table-region {
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
