<script lang="ts">
  import Logo from '$src/routes/Navbar/Logo.svelte'
  import NavbarMenu from './NavbarMenu.svelte'
</script>

<div class="navbar bg-base-100 lg:pl-6">
  <div class="flex-1 min-w-10">
    <div class="dropdown mr-4">
      <div tabindex="0" role="button" class="btn btn-ghost lg:hidden">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 12h8m-8 6h16" />
        </svg>
      </div>
      <NavbarMenu isCollapsed />
    </div>
    <a href="/" class="flex items-center">
      <Logo />
      <!-- Redundant with the Logo component -->
      <!-- <div class="hidden md:block ml-1 text-sm">PocketHost</div> -->
    </a>
  </div>
  <div class="flex-none">
    <NavbarMenu />
  </div>
</div>
