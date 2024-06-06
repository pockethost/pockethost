<script lang="ts">
  export let block = true
  export let height: string = 'h-full'
  export let marginBottom: string = ''
</script>

<!-- Setting the `container-type` allows us to use Container Queries -->
<div
  class="card card-body bg-base-200 {block
    ? 'block'
    : ''} {height} {marginBottom}"
  style="container-type: inline-size"
>
  <slot />
</div>
