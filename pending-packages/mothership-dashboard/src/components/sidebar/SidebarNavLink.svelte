<script lang="ts">
  import { page } from '$app/stores'
  import type { MouseEventHandler } from 'svelte/elements'

  export let url: string = ''
  export let icon: string = ''
  export let brandIcon: boolean = false
  export let iconSmall: boolean = false
  export let external: boolean = false
  export let handleClick: MouseEventHandler<HTMLElement> = () => {}

  let activeLink = $page.url.pathname === url
  $: activeLink = $page.url.pathname.includes(url)
</script>

<a
  href={url}
  class="{activeLink
    ? 'text-white bg-gray-800'
    : 'text-gray-400'} capitalize hover:text-white hover:bg-gray-800 group flex items-center gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold"
  on:click={handleClick}
>
  <i
    class="h-6 w-6 flex items-center justify-center {activeLink
      ? 'text-primary'
      : ''} {brandIcon ? 'fa-brands' : 'fa-light'} fa-{icon} {iconSmall
      ? 'text-sm'
      : 'text-xl'}"
  ></i>

  <slot />

  {#if external}
    <i
      class="fa-regular fa-arrow-up-right-from-square ml-auto opacity-50 text-xs"
    ></i>
  {/if}
</a>
