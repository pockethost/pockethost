<script lang="ts">
  import TinyButton from '$components/helpers/TinyButton.svelte'

  export let value: string = ''
  export let disabled: boolean = false
  export let save: (newValue: string) => Promise<string> = async () => 'saved'

  let msg = ''
  let oldValue = value
  let editedValue = value
  let editMode = false

  const startEdit = () => {
    oldValue = editedValue
    editMode = true
  }
  const cancelEdit = () => {
    editedValue = oldValue
    editMode = false
  }

  const saveEdit = () => {
    save(editedValue)
      .then((res) => {
        editMode = false
        msg = res
      })
      .catch((e) => {
        msg = e.message
      })
  }
</script>

{#if !editMode || disabled}
  {editedValue}
  <TinyButton click={startEdit} {disabled}>edit</TinyButton>
  {msg}
{/if}
{#if editMode && !disabled}
  <input type="text" bind:value={editedValue} />
  <TinyButton style="success" {disabled} click={saveEdit}>save</TinyButton>
  <TinyButton style="danger" {disabled} click={cancelEdit}>cancel</TinyButton>
{/if}
