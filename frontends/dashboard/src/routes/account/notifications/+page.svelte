<script lang="ts">
  import { client } from '$src/pocketbase-client'
  import { userStore } from '$util/stores'

  let notifyMaintenanceMode = !!$userStore?.notifyMaintenanceMode

  const save = () => {
    if (!$userStore) return
    client()
      .client.collection(`users`)
      .update($userStore?.id, { notifyMaintenanceMode })
  }
</script>

<div class="text-lg">System</div>

<div class="flex flex-col">
  <div class="form-control w-80">
    <label class="cursor-pointer label">
      <input
        type="checkbox"
        class="toggle toggle-primary m-2"
        bind:checked={notifyMaintenanceMode}
        on:change={save}
      />
      {#if notifyMaintenanceMode}
        <span class="label-text"
          ><div class="text-success">Email on Maintenance Mode</div>
          <div class="text-xs text-neutral-content">
            Receive an email when an instance enters Maintenance Mode, unless
            disabled at the instance level.
          </div></span
        >
      {:else}
        <span class="label-text"
          ><div class="text-error">Never email on Maintenance Mode</div>
          <div class="text-xs text-neutral-content">
            Never email when an instance enters Maintenance Mode.
          </div></span
        >
      {/if}
    </label>
  </div>
</div>
