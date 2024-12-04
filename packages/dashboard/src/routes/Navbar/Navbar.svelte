<script lang="ts">
  import Logo from '$src/routes/Navbar/Logo.svelte'
  import Fa from 'svelte-fa'
  import NavbarMenu from './NavbarMenu.svelte'
  import {
    faDiscord,
    faGithub,
    faProductHunt,
  } from '@fortawesome/free-brands-svg-icons'
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
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 12h8m-8 6h16"
          />
        </svg>
      </div>
      <NavbarMenu isCollapsed />
    </div>
    <a href="/" class="flex items-center pr-2 border-r-2 border-neutral">
      <Logo />
      <!-- Redundant with the Logo component -->
      <!-- <div class="hidden md:block ml-1 text-sm">PocketHost</div> -->
    </a>
    <a
      href="https://github.com/pockethost/pockethost"
      rel="noreferrer"
      target="_blank"
      class="m-2"
    >
      <Fa icon={faGithub} />
    </a>
    <a
      href="https://www.producthunt.com/products/pockethost"
      rel="noreferrer"
      target="_blank"
      class="m-2"
    >
      <Fa icon={faProductHunt} />
    </a>
    <a
      href="https://discord.gg/nVTxCMEcGT"
      rel="noreferrer"
      target="_blank"
      class="m-2"
    >
      <Fa icon={faDiscord} />
    </a>
  </div>
  <div class="flex-none">
    <NavbarMenu />
  </div>
</div>
