<script lang="ts">
  import { goto } from '$app/navigation'
  import { INSTANCE_ADMIN_URL } from '$src/env'
  import { client } from '$src/pocketbase-client'
  import { globalInstancesStore } from '$util/stores'
  import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
  import { values } from '@s-libs/micro-dash'
  import { type InstanceId } from 'pockethost/common'
  import Fa from 'svelte-fa'

  const { updateInstance } = client()

  const handlePowerChange = (id: InstanceId) => (e: Event) => {
    const target = e.target as HTMLInputElement
    const power = target.checked

    // Update the database with the new value
    updateInstance({ id, fields: { power } })
      .then(() => 'saved')
      .catch((error) => {
        error.data.message || error.message
      })
  }
</script>

{#each values($globalInstancesStore).sort( (a, b) => a.subdomain.localeCompare(b.subdomain), ) as instance, index}
  <button
    class={`card min-w-80 lg:max-w-80 flex-1 m-4 transition hover:bg-base-300 ${instance.power ? 'bg-neutral' : 'bg-base-200'}`}
    on:click={(_) => goto(`/instances/${instance.id}`)}
  >
    <div class="card-body w-full">
      <div class="card-title">
        <div class="flex justify-between items-center w-full">
          <span>{instance.subdomain.length > 15 ? instance.subdomain.slice(0, 15) + '...' : instance.subdomain}</span>
          <input
            type="checkbox"
            class="toggle {instance.power
              ? 'toggle-success'
              : 'bg-red-500 hover:bg-red-500'}"
            checked={instance.power}
            on:click={(e) => e.stopPropagation()}
            on:change={handlePowerChange(instance.id)}
          />
        </div>
      </div>
      <p class="text-left">
        <span class="text-gray-400"
          >Version {instance.version}
          <span class={instance.power ? 'hidden' : ''}>- Powered Off</span
          ></span
        >
      </p>

      <div class="card-actions flex justify-between mt-5">
        <a href={`/instances/${instance.id}`} class="btn btn-primary">
          <Fa icon={faCircleInfo} />
          <span>Details</span>
        </a>

        <a
          class="btn btn-secondary"
          href={INSTANCE_ADMIN_URL(instance)}
          target="_blank"
          on:click={(e) => e.stopPropagation()}
        >
          <img
            src="/images/pocketbase-logo.svg"
            alt="PocketBase Logo"
            class="w-6"
          />
          <span>Admin</span>
        </a>
      </div>
    </div>
  </button>
{/each}
