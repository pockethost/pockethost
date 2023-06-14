<script lang="ts">
  import { PUBLIC_APP_DOMAIN, PUBLIC_APP_PROTOCOL } from '$src/env'
  import { client } from '$src/pocketbase'
  import type { InstanceFields } from '@pockethost/common'

  export let instance: InstanceFields

  const { subdomain, status, version } = instance
  const url = `${PUBLIC_APP_PROTOCOL}://${subdomain}.${PUBLIC_APP_DOMAIN}`

  let msg = ''
  let _oldVersion = version
  let _version = version
  let editMode = false
  const startEdit = () => {
    _oldVersion = _version
    editMode = true
  }
  const cancelEdit = () => {
    _version = _oldVersion
    editMode = false
  }

  const saveEdit = () => {
    client()
      .saveVersion({ instanceId: instance.id, version: _version })
      .then(() => {
        editMode = false
        msg = 'saved'
      })
      .catch((e) => {
        msg = e.message
      })
  }
</script>

<div>
  Running {#if !editMode}
    {_version}
    <button
      type="button"
      class="btn btn-primary"
      style="--bs-btn-padding-y: .05rem; --bs-btn-padding-x: .5rem; --bs-btn-font-size: .75rem;"
      on:click={startEdit}
    >
      edit
    </button>
    {msg}
  {/if}
  {#if editMode}
    <input type="text" bind:value={_version} />
    <button
      type="button"
      class="btn btn-success"
      style="--bs-btn-padding-y: .05rem; --bs-btn-padding-x: .5rem; --bs-btn-font-size: .75rem;"
      on:click={saveEdit}
    >
      save
    </button>
    <button
      type="button"
      class="btn btn-danger"
      style="--bs-btn-padding-y: .05rem; --bs-btn-padding-x: .5rem; --bs-btn-font-size: .75rem;"
      on:click={cancelEdit}
    >
      cancel
    </button>
  {/if}
</div>
