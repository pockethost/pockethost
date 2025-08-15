<script>
  // Define the width of the sidebar
  const sidebarWidth = '300px'
  import { page } from '$app/stores'
  import BlurBg from '$components/BlurBg.svelte'
  import Logo from '$src/routes/Navbar/Logo.svelte'
  import DocLink from './DocLink.svelte'

  import { onMount } from 'svelte'

  let sidebarOpen = false
  let windowWidth = 0

  onMount(() => {
    windowWidth = window.innerWidth
    const resizeListener = () => (windowWidth = window.innerWidth)
    window.addEventListener('resize', resizeListener)
    return () => window.removeEventListener('resize', resizeListener)
  })

  function closeSidebar() {
    if (windowWidth < 768) sidebarOpen = false
  }

  $: {
    if (sidebarOpen && windowWidth < 768) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  }


</script>

<BlurBg className="opacity-20 blur-2xl" />

<div class="px-4 md:px-20">
  <div class="md:mt-8 flex gap-6 z-10 relative flex-col md:flex-row">
    <div
      class="flex md:hidden items-center sticky top-0 bg-gradient-to-b from-[#111111] to-[#111111]/40 shadow-md justify-start gap-6 py-3 border-y border-white/10 z-40"
    >
      <button on:click={() => (sidebarOpen = !sidebarOpen)}>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <h2 class="text-lg font-bold text-white truncate">Docs</h2>
    </div>

    {#if sidebarOpen && windowWidth < 768}
      <div class="fixed inset-0 bg-black bg-opacity-50 z-40 backdrop-blur-sm" on:click={closeSidebar}></div>
    {/if}

    <div
      class="flex flex-col min-w-24 fixed md:sticky overflow-y-scroll top-0 left-0 h-screen bg-[#111111] md:bg-transparent px-4 md:px-0 pb-10 md:pb-0 z-50 transform transition-transform duration-300"
      class:-translate-x-full={!sidebarOpen && windowWidth < 768}
       on:click={closeSidebar}
       role="presentation"
    >
      <ul class="menu text-base-content mb-6 pl-0">
        <li class="md:hidden flex justify-start text-white font-bold text-xl items-center flex-row">

          <Logo className="px-0 mr-4"/> Docs
        </li>

        <li class="menu-title">Overview</li>
        <DocLink path="introduction" title="Introduction" />
        <DocLink path="getting-started" title="Getting Started" />

        <li class="menu-title">Instance Management</li>
        <DocLink path="create" title="Create" />
        <DocLink path="accessing" title="Connect" />
        <DocLink path="power" title="Power" />
        <DocLink path="rename-instance" title="Rename" />
        <DocLink path="delete" title="Delete" />
        <DocLink path="limits" title="Limits" />
        <DocLink path="smtp" title="Outgoing Email" />
        <DocLink path="versions" title="Changing Versions" />
        <DocLink path="s3" title="Using S3 Storage" />
        <DocLink path="custom-binaries" title="Custom Binaries" />
        <DocLink path="custom-domains" title="Custom Domains" />
        <DocLink path="backup-restore" title="Backup/Restore" />

        <li class="menu-title">Daily Use Guide</li>
        <DocLink path="logs" title="Logging" />
        <DocLink path="dev-mode" title="Dev Mode" />
        <DocLink path="secrets" title="Secrets" />
        <DocLink path="webhooks" title="Webhooks" />
        <DocLink path="ftp" title="FTP Access" />
        <DocLink path="admin-sync" title="Admin Sync" />
        <DocLink path="js" title="Extending via JS" />

        <li class="menu-title">Programming Guide</li>
        <DocLink path="programming" title="Frontends and JS Hooks" />
        <DocLink path="server-side-pocketbase-antipattern" title="Server-Side PocketBase is an Anti-Pattern" />

        <li class="menu-title">Appendix</li>
        <DocLink path="account-creation" title="Account Creation" />
        <DocLink path="pricing-ethos" title="Pricing Ethos" />
        <DocLink path="faq" title="FAQ" />
        <DocLink path="gs-gmail" title="Google Suite Gmail Setup" />
        <DocLink path="ses" title="Amazon SES Setup" />
        <DocLink path="self-hosting" title="Self-Hosting" />
      </ul>
    </div>

    <!-- Main Content -->
    <div class="docs-content prose w-full md:w-fit md:max-w-[50%]">
      <slot />
    </div>
  </div>
</div>

<style lang="scss">
  .menu {
    @apply space-y-1;
  }
  .menu,
  .menu-title {
    @apply text-base;
  }

  .menu-title {
    @apply px-0;
  }
</style>
