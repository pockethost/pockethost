<script lang="ts">
  import Logo from '$src/routes/Navbar/Logo.svelte'
  import NavbarMenu from './NavbarMenu.svelte'
</script>

<div class="max-w-content mx-auto flex items-center justify-between px-4 py-3 md:px-20">
  <div class="m-0 flex min-w-10 flex-1 items-center">
    <wa-dropdown class="navbar-mobile-dropdown md:hidden">
      <wa-button slot="trigger" appearance="plain" class="mx-0 px-0 lg:hidden">
        <Logo />
      </wa-button>
      <NavbarMenu isCollapsed />
    </wa-dropdown>
    <a href="/" class="hidden items-center md:flex">
      <Logo />
    </a>

    <div class="mx-4 hidden h-5 w-px bg-white/15 md:block"></div>
    <div class="flex items-center gap-3 text-neutral-500">
      <a
        href="https://github.com/pockethost/pockethost"
        rel="noreferrer"
        target="_blank"
        class="transition-colors hover:text-white"
        aria-label="GitHub"
      >
        <wa-icon name="github" family="brands"></wa-icon>
      </a>
      <a
        href="https://www.producthunt.com/products/pockethost"
        rel="noreferrer"
        target="_blank"
        class="transition-colors hover:text-white"
        aria-label="Product Hunt"
      >
        <wa-icon name="product-hunt" family="brands"></wa-icon>
      </a>
      <a
        href="https://discord.gg/nVTxCMEcGT"
        rel="noreferrer"
        target="_blank"
        class="transition-colors hover:text-white"
        aria-label="Discord"
      >
        <wa-icon name="discord" family="brands"></wa-icon>
      </a>
      <a
        href="https://www.youtube.com/@pocketba5ed"
        rel="noreferrer"
        target="_blank"
        class="transition-colors hover:text-white"
        aria-label="YouTube"
      >
        <wa-icon name="youtube" family="brands"></wa-icon>
      </a>
    </div>
  </div>
  <div class="flex flex-none items-center">
    <NavbarMenu />
  </div>
</div>

<style>
  :global(.navbar-mobile-dropdown) {
    display: contents;
  }

  @media (min-width: 768px) {
    :global(.navbar-mobile-dropdown) {
      display: none !important;
    }
  }
</style>
