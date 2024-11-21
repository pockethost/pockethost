<script lang="ts">
  import { page } from '$app/stores'

  export let path: string
  export let title: string

  $: isActive = $page.url.pathname.endsWith(`/docs/${path}`)
</script>

<li class:active={isActive} class="w-48">
  <a href={`/docs/${path}`}>{title}</a>
</li>

<style lang="scss">
  li.active {
    @apply bg-neutral rounded-md;
  }
</style>
