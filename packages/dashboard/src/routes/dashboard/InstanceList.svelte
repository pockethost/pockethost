<script lang="ts">
  import { INSTANCE_ADMIN_URL } from '$src/env'
  import { client } from '$src/pocketbase-client'
  import { globalInstancesStore } from '$util/stores'
  import { values } from '@s-libs/micro-dash'
  import { InstanceId } from 'pockethost'

  const { updateInstance } = client()

  const handleMaintenanceChange = (id: InstanceId) => (e: Event) => {
    const target = e.target as HTMLInputElement
    const maintenance = !target.checked

    // Update the database with the new value
    updateInstance({ id, fields: { maintenance } })
      .then(() => 'saved')
      .catch((error) => {
        error.data.message || error.message
      })
  }
</script>

{#each values($globalInstancesStore).sort( (a, b) => a.subdomain.localeCompare(b.subdomain), ) as instance, index}
  <div class="card w-80 bg-neutral m-4">
    <div class="card-body">
      <div class="card-title">
        <div class="flex justify-between items-center w-full">
          <span
            >{instance.subdomain}
            <span class="text-xs text-gray-400">
              v{instance.version}
            </span>
          </span>
          <input
            type="checkbox"
            class="toggle {instance.maintenance
              ? 'bg-red-500 hover:bg-red-500'
              : 'toggle-success'}"
            checked={!instance.maintenance}
            on:change={handleMaintenanceChange(instance.id)}
          />
        </div>
      </div>

      <div class="card-actions flex justify-between mt-5">
        <a href={`/app/instances/${instance.id}`} class="btn btn-primary">
          <i class="fa-regular fa-circle-info"></i>
          <span>Details</span>
        </a>

        <a
          class="btn btn-secondary"
          href={INSTANCE_ADMIN_URL(instance)}
          target="_blank"
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
  </div>
{/each}
