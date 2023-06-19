<script lang="ts">
  import TinyButton from '$components/helpers/TinyButton.svelte'
  import { logger } from '@pockethost/common'

  export let value: string = ''
  export let disabled: boolean = false
  export let save: (newValue: string) => Promise<string> = async () => 'saved'

  const { dbg, error } = logger().create('MiniEdit.svelte')

  let msg = ''
  let err = ''
  let oldValue = value
  let editedValue = value
  let editMode = false
  let inputField: HTMLInputElement

  const startEdit = () => {
    msg = ''
    err = ''
    oldValue = editedValue
    editMode = true
    setTimeout(() => {
      inputField.focus()
      inputField.select()
    }, 0)
  }
  const cancelEdit = () => {
    editedValue = oldValue
    editMode = false
  }

  const saveEdit = () => {
    msg = ''
    err = ''
    save(editedValue)
      .then((res) => {
        editMode = false
        msg = res
      })
      .catch((e) => {
        error(`Got an error on save`, e)
        err = e.data?.data?.subdomain?.message || e.message
      })
  }
</script>

{#if !editMode || disabled}
  {editedValue}
  <TinyButton click={startEdit} {disabled}>edit</TinyButton>
{/if}
{#if editMode && !disabled}
  <input
    bind:this={inputField}
    type="text"
    bind:value={editedValue}
    on:focus={(event) => inputField.select()}
  />
  <TinyButton style="success" {disabled} click={saveEdit}>save</TinyButton>
  <TinyButton style="danger" {disabled} click={cancelEdit}>cancel</TinyButton>
{/if}
{#if msg}
  <span class="text-success">{msg}</span>
{/if}
{#if err}
  <span class="text-danger">{err}</span>
{/if}
