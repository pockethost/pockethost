<script lang="ts">
  import { page } from '$app/stores'

  export let path: string
  export let title: string

  $: isActive = $page.url.pathname.endsWith(`/docs/${path}`)
</script>

<a
  href={`/docs/${path}`}
  class="block w-48 px-2 py-1 rounded-md text-white hover:bg-white/10 {isActive ? 'bg-secondary/20' : ''}"
>
  {title}
</a>
