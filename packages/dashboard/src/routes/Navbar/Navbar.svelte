<script lang="ts">
  import Logo from '$src/routes/Navbar/Logo.svelte'
  import NavbarMenu from './NavbarMenu.svelte'
</script>

<div class="px-4 md:px-20 flex justify-between items-center">
  <div class="flex-1 min-w-10 m-0 flex items-center">
    <wa-dropdown class="md:hidden">
      <wa-button slot="trigger" appearance="plain" class="px-0 mx-0 lg:hidden">
        <Logo />
      </wa-button>
      <NavbarMenu isCollapsed />
    </wa-dropdown>
    <a href="/" class="hidden md:flex items-center">
      <Logo />
    </a>

    <div class="block h-8 w-px bg-gray-300 mx-4"></div>
    <div class="flex items-center gap-4">
      <a href="https://github.com/pockethost/pockethost" rel="noreferrer" target="_blank">
        <wa-icon name="github" family="brands"></wa-icon>
      </a>
      <a href="https://www.producthunt.com/products/pockethost" rel="noreferrer" target="_blank">
        <wa-icon name="product-hunt" family="brands"></wa-icon>
      </a>
      <a href="https://discord.gg/nVTxCMEcGT" rel="noreferrer" target="_blank">
        <wa-icon name="discord" family="brands"></wa-icon>
      </a>
      <a href="https://www.youtube.com/@pocketba5ed" rel="noreferrer" target="_blank">
        <wa-icon name="youtube" family="brands"></wa-icon>
      </a>
    </div>
  </div>
  <div class="flex-none flex items-center py-2">
    <NavbarMenu />
  </div>
</div>
