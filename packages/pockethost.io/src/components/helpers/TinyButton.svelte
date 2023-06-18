<script lang="ts">
  export let disabled: boolean = false
  export let style: 'primary' | 'warning' | 'danger' | 'success' = 'primary'
  export let click: () => void = () => {}
</script>

<button
  type="button"
  class="btn btn-{style}"
  {disabled}
  style="--bs-btn-padding-y: .05rem; --bs-btn-padding-x: .5rem; --bs-btn-font-size: .75rem;"
  on:click={click}><slot /></button
>
