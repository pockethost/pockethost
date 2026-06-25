<script lang="ts">
  import Logo from '$src/routes/Navbar/Logo.svelte'
  import { featureTabNavClass, type FeatureTabNavSection } from '$lib/dashboard/featureTabTypes'
  import type { Snippet } from 'svelte'

  interface Props {
    title: string
    mobileTitle?: string
    sections?: FeatureTabNavSection[]
    /** `narrow` = form-focused pages; `wide` = instance settings */
    width?: 'narrow' | 'wide'
    backHref?: string
    backLabel?: string
    children?: Snippet
    mobileHeader?: Snippet
    toolbar?: Snippet
    header?: Snippet
    alerts?: Snippet
  }

  let {
    title,
    mobileTitle = title,
    sections = [],
    width = 'narrow',
    backHref,
    backLabel = 'All',
    children,
    mobileHeader,
    toolbar,
    header,
    alerts,
  }: Props = $props()

  let sidebarOpen = $state(false)

  const handleCloseSidebar = (event: MouseEvent) => {
    const target = event.target as HTMLElement
    if (window.innerWidth < 768 && target.closest('a')) {
      sidebarOpen = false
    }
  }
</script>

<div class="tabbed-feature-layout mx-auto py-4 md:py-6" class:tabbed-feature-layout--wide={width === 'wide'}>
  <div
    class="tabbed-feature-mobile-bar flex items-center sticky top-0 gap-3 from-[#111111] to-[#111111]/40 bg-gradient-to-b shadow-md py-3 mb-4 border-b border-white/10 z-40 -mx-4 px-4 justify-between"
  >
    <div class="flex items-center gap-3 min-w-0">
      {#if backHref}
        <wa-button href={backHref} variant="neutral" size="s" appearance="outline" class="tabbed-feature-back-btn">
          <wa-icon slot="start" name="arrow-left"></wa-icon>
          {backLabel}
        </wa-button>
      {/if}
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

  {#if backHref}
    <wa-button
      href={backHref}
      variant="neutral"
      size="s"
      appearance="outline"
      class="tabbed-feature-back-btn tabbed-feature-back-btn--desktop"
    >
      <wa-icon slot="start" name="arrow-left"></wa-icon>
      {backLabel}
    </wa-button>
  {/if}

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
      class="tabbed-feature-sidebar flex flex-col w-52 md:w-44 shrink-0 fixed md:relative top-0 left-0 h-full md:h-auto bg-[#111111] md:bg-transparent px-4 md:px-0 z-50 pt-4 md:pt-0 overflow-y-auto md:overflow-visible"
      class:tabbed-feature-sidebar--open={sidebarOpen}
      onclick={handleCloseSidebar}
      role="presentation"
    >
      <div class="md:hidden flex items-center pb-4 mb-2 border-b border-white/10">
        <Logo />
      </div>

      {#if backHref}
        <wa-button
          href={backHref}
          variant="neutral"
          size="s"
          appearance="plain"
          class="tabbed-feature-back-btn tabbed-feature-back-btn--sidebar"
          onclick={() => (sidebarOpen = false)}
        >
          <wa-icon slot="start" name="arrow-left"></wa-icon>
          {backLabel}
        </wa-button>
      {/if}

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

    <div class="flex-1 min-w-0" class:max-w-2xl={width === 'narrow'}>
      {@render children?.()}
    </div>
  </div>
</div>

<style>
  .tabbed-feature-layout {
    max-width: 56rem;
  }

  .tabbed-feature-layout--wide {
    max-width: none;
  }

  .tabbed-feature-sidebar {
    transform: translateX(-100%);
    transition: transform 300ms ease;
  }

  @media (min-width: 768px) {
    .tabbed-feature-sidebar {
      transform: none;
      transition: none;
    }
  }

  .tabbed-feature-sidebar--open {
    transform: translateX(0);
  }

  .tabbed-feature-mobile-bar {
    display: flex;
  }

  @media (min-width: 768px) {
    .tabbed-feature-mobile-bar {
      display: none !important;
    }
  }

  .tabbed-feature-back-btn--desktop {
    display: none;
    margin-bottom: 0.75rem;
  }

  @media (min-width: 768px) {
    .tabbed-feature-back-btn--desktop {
      display: inline-flex;
    }
  }

  .tabbed-feature-back-btn--sidebar {
    width: 100%;
    justify-content: flex-start;
    margin-bottom: 0.5rem;
  }
</style>
