<script lang="ts">
  import { fade } from 'svelte/transition'
  import { client } from '$src/pocketbase-client'
  import { instance } from '../store'
  import { trustedItems } from './stores'
  import Fa from 'svelte-fa'
  import { faTrash } from '@fortawesome/free-solid-svg-icons'

  const handleDelete = (cidr: string) => async () => {
    trustedItems.delete(cidr)
    await client().updateInstance({
      id: $instance.id,
      fields: { trusted_ips: $trustedItems },
    })
  }
</script>

{#if $trustedItems.length === 0}
  <div class="alert border-2 border-primary mb-8">
    <span>No trusted IPs yet. Add your office or shared network IP to raise its per-IP quota on this instance.</span>
  </div>
{:else}
  <table class="table mb-8">
    <thead>
      <tr>
        <th class="border-b-2 border-neutral">IP / CIDR</th>
        <th class="border-b-2 border-neutral">Label</th>
        <th class="border-b-2 border-neutral text-right">Actions</th>
      </tr>
    </thead>
    <tbody>
      {#each $trustedItems as item}
        <tr transition:fade>
          <td><code>{item.cidr}</code></td>
          <td>{item.label || '—'}</td>
          <td class="text-right">
            <button
              aria-label="Delete"
              on:click={handleDelete(item.cidr)}
              type="button"
              class="btn btn-sm btn-square btn-outline btn-warning"
            >
              <Fa icon={faTrash} />
            </button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}
