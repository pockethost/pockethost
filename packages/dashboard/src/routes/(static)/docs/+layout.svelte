<script>
  const sidebarWidth = '300px'
  import Logo from '$src/routes/Navbar/Logo.svelte'
  import DocLink from './DocLink.svelte'
  import { docsNav, getPrevNext } from './docs-nav'
  import { page } from '$app/stores'
  import { onMount } from 'svelte'
  export let data

  let sidebarOpen = false
  let windowWidth = 0

  $: if (typeof document !== 'undefined' && windowWidth < 768) {
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
  }

  onMount(() => {
    windowWidth = window.innerWidth
    const resizeListener = () => (windowWidth = window.innerWidth)
    window.addEventListener('resize', resizeListener)
    return () => window.removeEventListener('resize', resizeListener)
  })

  function closeSidebar() {
    if (windowWidth < 768) sidebarOpen = false
  }

  $: ({ title, description } = data.meta || {})
  $: ({ prev, next } = getPrevNext($page.url.pathname.replace(/\/$/, '').split('/').pop() || ''))
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />

  <meta property="og:url" content={data.url} />
  <meta property="og:type" content="website" />
  <meta property="og:title" content={title} />
  {#if description}
    <meta property="og:description" content={description} />
  {/if}

  {#if title}
    <meta property="og:image" content={'https://cdn.cheto.app/og/joioes1x8zagn0v?name=' + encodeURIComponent(title)} />
  {/if}

  <meta name="twitter:card" content="summary_large_image" />
  <meta property="twitter:url" content={data.url} />
  <meta name="twitter:title" content={title} />
  {#if description}
    <meta name="twitter:description" content={description} />
  {/if}

  {#if title}
    <meta name="twitter:image" content={'https://cdn.cheto.app/og/joioes1x8zagn0v?name=' + encodeURIComponent(title)} />
  {/if}
</svelte:head>

<div class="px-4 md:px-20">
  <div class="md:mt-8 flex gap-6 z-10 relative flex-col md:flex-row">
    <div
      class="flex md:hidden items-center sticky top-0 bg-gradient-to-b from-[#111111] to-[#111111]/40 shadow-md justify-start gap-6 py-3 border-y border-white/10 z-40"
    >
      <button onclick={() => (sidebarOpen = !sidebarOpen)}>
        <wa-icon name="bars"></wa-icon>
      </button>
      <h2 class="text-lg font-bold text-white truncate">Docs</h2>
    </div>

    {#if sidebarOpen && windowWidth < 768}
      <div class="fixed inset-0 bg-black bg-opacity-50 z-40 backdrop-blur-sm" onclick={closeSidebar}></div>
    {/if}

    <div
      class="flex w-[300px] shrink-0 flex-col fixed md:sticky overflow-y-auto top-0 left-0 md:top-8 md:h-[calc(100vh-4rem)] h-screen bg-[#111111] md:bg-transparent px-4 md:px-0 pb-10 md:pb-0 z-50 transform transition-transform duration-300"
      class:-translate-x-full={!sidebarOpen && windowWidth < 768}
      onclick={closeSidebar}
      role="presentation"
    >
      <nav class="flex flex-col gap-1 text-white mb-6 pl-0">
        <div class="md:hidden flex justify-start text-white font-bold text-xl items-center flex-row py-2">
          <Logo className="px-0 mr-4" /> Docs
        </div>

        {#each docsNav as section}
          <div class="text-sm font-semibold text-white/60 uppercase tracking-wide pt-4 pb-1">{section.title}</div>
          {#each section.items as item}
            <DocLink path={item.slug} title={item.title} indent={item.indent} />
          {/each}
        {/each}
      </nav>
    </div>

    <div class="docs-content prose max-w-prose w-full min-w-0 text-white/90">
      <slot />

      {#if prev || next}
        <nav class="not-prose flex justify-between gap-4 mt-12 pt-6 border-t border-white/10 text-sm">
          {#if prev}
            <a href={`/docs/${prev.slug}`} class="text-white/70 hover:text-white no-underline">← {prev.title}</a>
          {:else}
            <span></span>
          {/if}
          {#if next}
            <a href={`/docs/${next.slug}`} class="text-white/70 hover:text-white no-underline text-right"
              >{next.title} →</a
            >
          {/if}
        </nav>
      {/if}
    </div>
  </div>
</div>
