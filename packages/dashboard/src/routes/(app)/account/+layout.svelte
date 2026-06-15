<script lang="ts">
  import { page } from '$app/stores'
  import Logo from '$src/routes/Navbar/Logo.svelte'

  let sidebarOpen = false

  function handleCloseSidebar(event: MouseEvent) {
    const target = event.target as HTMLElement
    if (window.innerWidth < 768 && target.closest('a')) {
      sidebarOpen = false
    }
  }

  $: pathname = $page.url.pathname
  $: isAccountActive = pathname === '/account' || pathname === '/account/'
  $: isKeysActive = pathname.startsWith('/account/keys')
  $: activeClass = (active: boolean) =>
    active ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white hover:bg-white/5'
</script>

<div class="max-w-4xl mx-auto py-4 md:py-8">
  <div
    class="flex md:hidden items-center sticky top-0 gap-3 from-[#111111] to-[#111111]/40 bg-gradient-to-b shadow-md py-3 mb-4 border-b border-white/10 z-40 -mx-4 px-4"
  >
    <button type="button" onclick={() => (sidebarOpen = !sidebarOpen)} aria-label="Toggle settings menu">
      <wa-icon name="bars"></wa-icon>
    </button>
    <h1 class="text-lg font-bold text-white">Settings</h1>
  </div>

  <h1 class="hidden md:block text-2xl md:text-3xl font-bold text-white mb-6 md:mb-8">Settings</h1>

  {#if sidebarOpen}
    <div
      class="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm md:hidden"
      onclick={() => (sidebarOpen = false)}
      role="presentation"
    ></div>
  {/if}

  <div class="flex gap-6 md:gap-8 flex-col md:flex-row relative">
    <aside
      class="flex flex-col w-52 md:w-44 shrink-0 fixed md:relative top-0 left-0 h-full md:h-auto bg-[#111111] md:bg-transparent px-4 md:px-0 z-50 transition-transform duration-300 -translate-x-full md:translate-x-0 pt-4 md:pt-0"
      class:translate-x-0={sidebarOpen}
      onclick={handleCloseSidebar}
      role="presentation"
    >
      <div class="md:hidden flex items-center pb-4 mb-2 border-b border-white/10">
        <Logo />
      </div>

      <nav class="flex flex-col gap-1 text-sm font-medium">
        <a
          href="/account"
          class="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors {activeClass(isAccountActive)}"
        >
          <wa-icon name="user" class="text-base opacity-70"></wa-icon>
          Account
        </a>
        <a
          href="/account/keys"
          class="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors {activeClass(isKeysActive)}"
        >
          <wa-icon name="key" class="text-base opacity-70"></wa-icon>
          Keys
        </a>
      </nav>
    </aside>

    <div class="flex-1 min-w-0 max-w-2xl">
      {#key pathname}
        <slot />
      {/key}
    </div>
  </div>
</div>
