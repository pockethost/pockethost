<script lang="ts">
  import type { Snippet } from 'svelte'
  import Logo from '$src/routes/Navbar/Logo.svelte'
  import { featureTabNavClass, type FeatureTabNavSection } from '$lib/dashboard/featureTabTypes'

  interface Props {
    title: string
    mobileTitle?: string
    sections?: FeatureTabNavSection[]
    mobileHeader?: Snippet
    header?: Snippet
    toolbar?: Snippet
    alerts?: Snippet
    children?: Snippet
  }

  let {
    title,
    mobileTitle = title,
    sections = [],
    mobileHeader,
    header,
    toolbar,
    alerts,
    children,
  }: Props = $props()

  let sidebarOpen = $state(false)

  const handleCloseSidebar = (event: MouseEvent) => {
    const target = event.target as HTMLElement
    if (window.innerWidth < 768 && target.closest('a')) {
      sidebarOpen = false
    }
  }
</script>

<div class="max-w-4xl mx-auto py-4 md:py-8">
  <div
    class="flex md:hidden items-center sticky top-0 gap-3 from-[#111111] to-[#111111]/40 bg-gradient-to-b shadow-md py-3 mb-4 border-b border-white/10 z-40 -mx-4 px-4 justify-between"
  >
    <div class="flex items-center gap-3 min-w-0">
      <button type="button" onclick={() => (sidebarOpen = !sidebarOpen)} aria-label="Toggle menu">
        <wa-icon name="bars"></wa-icon>
      </button>
      {#if mobileHeader}
        {@render mobileHeader()}
      {:else}
        <h1 class="text-lg font-bold text-white truncate">{mobileTitle}</h1>
      {/if}
    </div>
    {#if toolbar}
      <div class="flex-shrink-0">
        {@render toolbar()}
      </div>
    {/if}
  </div>

  <div class="hidden md:flex flex-row items-start justify-between gap-4 mb-6 md:mb-8">
    {#if header}
      {@render header()}
    {:else}
      <h1 class="text-2xl md:text-3xl font-bold text-white">{title}</h1>
    {/if}
    {#if toolbar}
      {@render toolbar()}
    {/if}
  </div>

  {#if alerts}
    <div class="mb-4 md:mb-6">
      {@render alerts()}
    </div>
  {/if}

  {#if sidebarOpen}
    <div
      class="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm md:hidden"
      onclick={() => (sidebarOpen = false)}
      role="presentation"
    ></div>
  {/if}

  <div class="flex gap-6 md:gap-8 flex-col md:flex-row relative">
    <aside
      class="flex flex-col w-52 md:w-44 shrink-0 fixed md:relative top-0 left-0 h-full md:h-auto bg-[#111111] md:bg-transparent px-4 md:px-0 z-50 transition-transform duration-300 -translate-x-full md:translate-x-0 pt-4 md:pt-0 overflow-y-auto md:overflow-visible"
      class:translate-x-0={sidebarOpen}
      onclick={handleCloseSidebar}
      role="presentation"
    >
      <div class="md:hidden flex items-center pb-4 mb-2 border-b border-white/10">
        <Logo />
      </div>

      {#each sections as section (section.title ?? section.items.map((item) => item.href).join(','))}
        {#if section.title}
          <p class="text-xs font-semibold uppercase tracking-wide text-white/40 px-3 pt-5 pb-1">
            {section.title}
          </p>
        {/if}

        <nav class="flex flex-col gap-1 text-sm font-medium">
          {#each section.items as item (item.href)}
            <a
              href={item.href}
              rel={item.external ? 'noreferrer' : undefined}
              target={item.external ? '_blank' : undefined}
              class="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors {featureTabNavClass(
                !!item.isActive,
                item.variant
              )}"
            >
              {#if item.imageSrc}
                <img src={item.imageSrc} alt="" class="w-4 h-4 opacity-70" />
              {:else if item.icon}
                <wa-icon name={item.icon} class="text-base opacity-70"></wa-icon>
              {/if}
              {item.label}
              {#if item.external}
                <wa-icon name="arrow-up-right-from-square" class="text-xs opacity-50 ml-auto"></wa-icon>
              {/if}
            </a>
          {/each}
        </nav>
      {/each}
    </aside>

    <div class="flex-1 min-w-0 max-w-2xl">
      {#if children}
        {@render children()}
      {/if}
    </div>
  </div>
</div>
