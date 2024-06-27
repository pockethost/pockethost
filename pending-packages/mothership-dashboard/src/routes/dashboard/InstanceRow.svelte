<script lang="ts">
  import { INSTANCE_ADMIN_URL } from '$src/env.js'
  import { InstanceFields } from 'pockethost/common'

  export let instance: InstanceFields
  export let index: number
</script>

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
        Version: {instance.version}
      </div>

      {#if instance.maintenance}
        <div class="badge badge-outline border-warning gap-2">
          <i class="fa-regular fa-triangle-person-digging text-warning"></i>
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
