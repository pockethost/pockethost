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

{#each values($globalInstancesStore).sort((a, b) => a.subdomain.localeCompare(b.subdomain)) as instance}
  <button
    class={`card flex-1 transition border border-white/10 ${instance.power ? 'hover:border-green-400/60' : 'hover:border-red-400/60'} hover:bg-black/50 rounded-xl shadow-md overflow-hidden 
      ${instance.power ? 'bg-black/40' : 'bg-black/40'}`}
    on:click={() => goto(`/instances/${instance.id}`)}
  >
    <div class="card-body w-full flex flex-row items-center justify-between gap-6">
      <div class="flex flex-col items-start gap-2">
        <span class="text-xl font-semibold truncate max-w-[200px]">
          {instance.subdomain} 
        </span>

        <div class="flex flex-wrap gap-1">
          <a
            href={INSTANCE_ADMIN_URL(instance)}
            target="_blank"
            on:click={(e) => e.stopPropagation()}
            class="pr-2 py-0.5 rounded-full text-xs font-medium flex gap-2"
            title="Open Admin"
          >
            <img src="/images/pocketbase-logo.svg" alt="PocketBase Logo" class="w-4 h-4" /> Admin
          </a>
          <p
            class={`px-2 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border-gray-500/30`}
          >
            <span>v{instance.version}</span>
          </p>
         
        </div>


      </div>

      <div class="flex flex-col items-center gap-3">
        <input
          type="checkbox"
          class={`toggle ${instance.power ? 'toggle-success' : 'bg-red-500 hover:bg-red-500'}`}
          checked={instance.power}
          on:click={(e) => e.stopPropagation()}
          on:change={handlePowerChange(instance.id)}
        />

        
      </div>
    </div>
  </button>
{/each}
