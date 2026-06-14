<script lang="ts">
  import { gravatarUrl } from '$lib/gravatar'
  import { writable } from 'svelte/store'
  import { userStore } from '$util/stores'

  /** Avatar diameter in pixels */
  export let size = 32

  let className = ''
  export { className as class }

  const avatar = writable('')
  $: {
    if ($userStore?.email) {
      avatar.set(gravatarUrl($userStore.email, size))
    } else {
      avatar.set('')
    }
  }
</script>

<div
  class="avatar-root shrink-0 overflow-hidden rounded-full bg-white/10 {className}"
  style:width="{size}px"
  style:height="{size}px"
>
  {#if $avatar}
    <img src={$avatar} alt="" width={size} height={size} class="avatar-img" />
  {/if}
</div>

<style>
  .avatar-root {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 0;
  }

  .avatar-img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
</style>
