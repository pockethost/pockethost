<script lang="ts">
  import { page } from '$app/stores'
  import {
    faArrowUpRightFromSquare,
    type IconDefinition,
  } from '@fortawesome/free-solid-svg-icons'
  import Fa from 'svelte-fa'
  import type { MouseEventHandler } from 'svelte/elements'

  export let url: string = ''
  export let icon: IconDefinition | null = null
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
  {#if icon}
    <Fa
      {icon}
      class="h-6 w-6 flex items-center justify-center {activeLink
        ? 'text-primary'
        : ''} {iconSmall ? 'text-sm' : 'text-xl'}"
    />
  {/if}

  <slot />

  {#if external}
    <Fa icon={faArrowUpRightFromSquare} class="opacity-50 text-xs" />
  {/if}
</a>
