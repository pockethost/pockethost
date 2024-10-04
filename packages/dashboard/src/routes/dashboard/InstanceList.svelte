<script lang="ts">
  import { INSTANCE_ADMIN_URL } from '$src/env'
  import { globalInstancesStore } from '$util/stores'
  import { values } from '@s-libs/micro-dash'
</script>

{#each values($globalInstancesStore).sort( (a, b) => a.subdomain.localeCompare(b.subdomain), ) as instance, index}
  <div class="card w-80 bg-neutral m-4">
    <div class="card-body">
      <div class="card-title">{instance.subdomain}</div>

      <div class="flex flex-wrap gap-2">
        <div class="badge badge-accent badge-outline">
          Status: &nbsp;<span class="capitalize">{instance.status}</span>
        </div>
        <div class="badge badge-accent badge-outline">
          Version: {instance.version}
        </div>

        {#if instance.maintenance}
          <div class="badge badge-outline border-warning gap-2">
            <i class="fa-regular fa-triangle-person-digging text-warning"></i>
            <span class="text-warning">Maintenance Mode</span>
          </div>
        {/if}
      </div>
      <div class="card-actions">
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
