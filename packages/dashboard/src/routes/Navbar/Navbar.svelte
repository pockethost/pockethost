<script lang="ts">
  import Logo from '$src/routes/Navbar/Logo.svelte'
  import NavbarMenu from './NavbarMenu.svelte'
</script>

<div class="max-w-content mx-auto flex items-center justify-between px-4 py-3 md:px-20">
  <div class="m-0 flex min-w-10 flex-1 items-center">
    <a href="/" class="flex items-center" aria-label="PocketHost home">
      <Logo />
    </a>

    <div class="mx-4 hidden h-5 w-px bg-white/15 md:block"></div>
    <div class="hidden items-center gap-3 text-neutral-500 sm:flex">
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
  <div class="flex flex-none items-center gap-1">
    <NavbarMenu />
    <wa-dropdown placement="bottom-end" class="navbar-mobile-dropdown">
      <button slot="trigger" type="button" class="navbar-menu-button" aria-label="Open menu">
        <wa-icon name="bars"></wa-icon>
        <span>Menu</span>
      </button>
      <NavbarMenu isCollapsed />
    </wa-dropdown>
  </div>
</div>

<style>
  :global(.navbar-mobile-dropdown) {
    display: inline-flex;
  }

  .navbar-menu-button {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.7rem;
    border: 1px solid rgb(255 255 255 / 0.18);
    border-radius: 0.5rem;
    background: rgb(255 255 255 / 0.04);
    color: #fff;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
  }

  @media (min-width: 768px) {
    :global(.navbar-mobile-dropdown) {
      display: none !important;
    }
  }
</style>
