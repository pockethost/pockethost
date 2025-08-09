<script lang="ts">
  export let block = true
  export let height: string = 'h-full'
  export let marginBottom: string = ''
</script>

<!-- Setting the `container-type` allows us to use Container Queries -->
<div
  class="card card-body  w-96 bg-[#111111]/60 border border-white/10 shadow-md {block ? 'block' : ''} {height} {marginBottom}"
  style="container-type: inline-size"
>
  <slot />
</div>
