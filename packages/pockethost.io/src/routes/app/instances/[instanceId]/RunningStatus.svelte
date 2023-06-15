<script lang="ts">
  import TinyButton from '$components/helpers/TinyButton.svelte'
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
    <TinyButton click={startEdit}>edit</TinyButton>
    {msg}
  {/if}
  {#if editMode}
    <input type="text" bind:value={_version} />
    <TinyButton style="success" click={saveEdit}>save</TinyButton>
    <TinyButton style="danger" click={cancelEdit}>cancel</TinyButton>
  {/if}
</div>
