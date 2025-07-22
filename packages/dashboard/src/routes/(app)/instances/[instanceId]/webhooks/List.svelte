<script lang="ts">
  import { fade } from 'svelte/transition'
  import { items } from './stores'
  import { client } from '$src/pocketbase-client'
  import { instance } from '../store'
  import { reduce } from '@s-libs/micro-dash'
  import { logger, type UpdateInstancePayload } from 'pockethost/common'
  import Fa from 'svelte-fa'
  import { faTrash, faChevronDown, faChevronRight } from '@fortawesome/free-solid-svg-icons'

  // Track which webhooks have expanded details
  let expandedWebhooks: Set<string> = new Set()

  const toggleExpanded = (endpoint: string) => {
    if (expandedWebhooks.has(endpoint)) {
      expandedWebhooks.delete(endpoint)
    } else {
      expandedWebhooks.add(endpoint)
    }
    expandedWebhooks = expandedWebhooks
  }

  const getStatusColor = (status: number | undefined) => {
    if (!status) return 'text-gray-400'
    if (status >= 200 && status < 300) return 'text-success'
    if (status >= 400) return 'text-error'
    return 'text-warning'
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const handleDelete = (name: string) => async (e: Event) => {
    e.preventDefault()
    logger().debug(`Deleting ${name}`)
    items.delete(name)
    await client().updateInstance({
      id: $instance.id,
      fields: {
        webhooks: $items,
      },
    })
  }
</script>

<table class="table mb-8">
  <thead>
    <tr>
      <th class="w-1/3 border-b-2 border-neutral">API Endpoint</th>
      <th class="w-1/3 border-b-2 border-neutral">Schedule</th>
      <th class="w-1/6 border-b-2 border-neutral">Status</th>
      <th class="w-1/6 border-b-2 border-neutral text-right">Actions</th>
    </tr>
  </thead>

  <tbody>
    {#each $items as item}
      <tr transition:fade>
        <th>{item.endpoint}</th>
        <td>{item.value}</td>
        <td>
          {#if item.lastFired}
            <button
              class="btn btn-ghost btn-sm p-1 {getStatusColor(item.lastFired.response.status)}"
              on:click={() => toggleExpanded(item.endpoint)}
              title="Click to view response details"
            >
              <Fa icon={expandedWebhooks.has(item.endpoint) ? faChevronDown : faChevronRight} class="mr-1" />
              <span class="font-mono font-bold">{item.lastFired.response.status}</span>
            </button>
          {:else}
            <span class="text-gray-400">No runs yet</span>
          {/if}
        </td>
        <td class="text-right">
          <button
            aria-label="Delete"
            on:click={handleDelete(item.endpoint)}
            type="button"
            class="btn btn-sm btn-square btn-outline btn-warning"><Fa icon={faTrash} /></button
          >
        </td>
      </tr>

      {#if item.lastFired && expandedWebhooks.has(item.endpoint)}
        <tr transition:fade>
          <td colspan="4" class="bg-base-200 p-4">
            <div class="space-y-2">
              <div class="flex justify-between items-center">
                <h4 class="font-semibold">Last Execution Details</h4>
                <span class="text-sm text-gray-500">{formatTimestamp(item.lastFired.timestamp)}</span>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="font-medium text-sm">Status Code:</label>
                  <div class="mt-1">
                    <span
                      class="badge {item.lastFired.response.status >= 200 && item.lastFired.response.status < 300
                        ? 'badge-success'
                        : 'badge-error'}"
                    >
                      {item.lastFired.response.status}
                    </span>
                  </div>
                </div>

                <div class="md:col-span-1">
                  <label class="font-medium text-sm">Response Body:</label>
                  <div class="mt-1">
                    <pre class="text-xs bg-base-300 p-2 rounded max-h-32 overflow-y-auto">{item.lastFired.response
                        .body || '(empty)'}</pre>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      {/if}
    {/each}
  </tbody>
</table>
