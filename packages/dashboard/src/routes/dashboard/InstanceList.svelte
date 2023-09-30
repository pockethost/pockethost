<script>
  import { globalInstancesStore } from '$util/stores'
  import { fly } from 'svelte/transition'
  import { backOut } from 'svelte/easing'
  import { PUBLIC_APP_DOMAIN } from '$src/env'
  import ProvisioningStatus from '$components/ProvisioningStatus.svelte'

  // Convert the object of objects into an array of objects
  const allInstancesArray = Object.values($globalInstancesStore);
</script>


<div class='card card-body bg-base-200 mb-4'>
  <h3 class='text-xl font-bold mb-4'>Active Instances</h3>

  <div class="grid">
    {#each allInstancesArray as instance, index}
      {#if index !== 0}
        <!--<div class="divider m-0 h-auto"></div>-->
      {/if}

      <div class='flex items-center justify-between transition-all duration-500 py-8 px-4 rounded-2xl {index % 2 === 0 ? "" : "bg-base-100"}'>
        <div>
          <h4 class="font-bold capitalize mb-2">{instance.subdomain}</h4>

          <div class='flex items-center gap-2'>
            <div class="badge badge-accent badge-outline">Status: &nbsp;<span class='capitalize'>{instance.status}</span></div>
            <div class="badge badge-accent badge-outline">Usage: {Math.ceil(instance.secondsThisMonth / 60)} mins</div>
            <div class="badge badge-accent badge-outline">Version: {instance.version}</div>
          </div>
        </div>


        <div class="flex items-center gap-2">
          <a href={`/app/instances/${instance.id}`} class="btn btn-primary">
            <i class="bi bi-gear-fill" />
            <span>Details</span>
          </a>

          <a
            class="btn btn-secondary"
            href={`https://${instance.subdomain}.${PUBLIC_APP_DOMAIN}/_`}
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
    {/each}
  </div>
</div>