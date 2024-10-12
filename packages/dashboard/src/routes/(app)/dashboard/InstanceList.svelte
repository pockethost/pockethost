<script lang="ts">
  import { INSTANCE_ADMIN_URL } from '$src/env'
  import { client } from '$src/pocketbase-client'
  import { globalInstancesStore } from '$util/stores'
  import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
  import { values } from '@s-libs/micro-dash'
  import { type InstanceId } from 'pockethost'
  import Fa from 'svelte-fa'

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
  <!-- Dunno why min-w-80 doesn't work but min-w-[20rem] does -->
  <!-- A little transition goes a long way -->
  <div class={`card flex-1 min-w-[20rem] m-4 transition ${instance.maintenance ? "bg-base-200" : "bg-neutral"}`}>
    <div class="card-body">
      <div class="card-title">
        <div class="flex justify-between items-center w-full">
          <span>{instance.subdomain}</span>
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
      <p>
        <span class="text-gray-400">Version {instance.version}
        <span class={!instance.maintenance ? "hidden" : ""}>- Maintenance</span></span>
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
