<script>
  import { globalInstancesStore } from '$util/stores'
  import { fly } from 'svelte/transition'
  import { backOut } from 'svelte/easing'
  import { PUBLIC_APP_DOMAIN } from '$src/env'
  import ProvisioningStatus from '$components/ProvisioningStatus.svelte'
  import Card from '$components/cards/Card.svelte'
  import CardHeader from '$components/cards/CardHeader.svelte'

  // Convert the object of objects into an array of objects
  const allInstancesArray = Object.values($globalInstancesStore)
</script>

<Card height="h-auto">
  <CardHeader>Active Instances</CardHeader>

  <div class="grid">
    {#each allInstancesArray as instance, index}
      <div
        class="lg:flex items-center justify-between transition-all duration-500 lg:py-8 py-16 px-4 rounded-2xl {index %
          2 ===
        0
          ? ''
          : 'bg-base-100'}"
      >
        <div class="lg:text-left text-center mb-6 lg:mb-0">
          <h4 class="font-bold capitalize mb-2">{instance.subdomain}</h4>

          <div class="flex items-center flex-wrap justify-center gap-2">
            <div class="badge badge-accent badge-outline">
              Status: &nbsp;<span class="capitalize">{instance.status}</span>
            </div>
            <div class="badge badge-accent badge-outline">
              Usage: {Math.ceil(instance.secondsThisMonth / 60)} mins
            </div>
            <div class="badge badge-accent badge-outline">
              Version: {instance.version}
            </div>

            {#if instance.maintenance}
              <div class="badge badge-outline border-warning gap-2">
                <i class="fa-regular fa-triangle-person-digging text-warning"
                ></i>
                <span class="text-warning">Maintenance Mode</span>
              </div>
            {/if}
          </div>
        </div>

        <div class="flex items-center justify-center gap-2">
          <a href={`/app/instances/${instance.id}`} class="btn btn-primary">
            <i class="fa-regular fa-circle-info"></i>
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
</Card>
