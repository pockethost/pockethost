<script lang="ts">
  import { uniqueId } from '@s-libs/micro-dash'

  export let value: boolean = false
  export let save: (newValue: boolean) => Promise<string> = async () => 'saved'

  const id = uniqueId()
  let msg = ''

  const onChange = () => {
    save(value)
      .then((res) => {
        msg = res
      })
      .catch((e) => {
        msg = e.message
      })
  }
</script>

<div class="form-check form-switch">
  <input
    class="form-check-input"
    type="checkbox"
    role="switch"
    {id}
    bind:checked={value}
    on:change={onChange}
  />
  <label class="form-check-label" for={id}><slot /></label>
</div>
