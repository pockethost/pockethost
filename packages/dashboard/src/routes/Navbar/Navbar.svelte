<script lang="ts">
  import Logo from '$src/routes/Navbar/Logo.svelte'
  import Fa from 'svelte-fa'
  import NavbarMenu from './NavbarMenu.svelte'
  import { faDiscord, faGithub, faProductHunt, faYoutube } from '@fortawesome/free-brands-svg-icons'
</script>

<div class="navbar px-4 md:px-20 flex">
  <div class="flex-1 min-w-10">
    <div class="dropdown mr-5">
      <div tabindex="0" role="button" class="btn btn-ghost px-0 hover:bg-transparent lg:hidden">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h8m-8 6h16" />
        </svg>
      </div>
      <NavbarMenu isCollapsed />
    </div>
    <a href="/" class="flex items-center">
      <Logo />
      <!-- Redundant with the Logo component -->
      <!-- <div class="hidden md:block ml-1 text-sm">PocketHost</div> -->
    </a>
    
    <div class="block h-8 w-px bg-gray-300 mx-4"></div>
    <div class="flex items-center  gap-4">
      <a href="https://github.com/pockethost/pockethost" rel="noreferrer" target="_blank">
        <Fa icon={faGithub} />
      </a>
      <a href="https://www.producthunt.com/products/pockethost" rel="noreferrer" target="_blank">
        <Fa icon={faProductHunt} />
      </a>
      <a href="https://discord.gg/nVTxCMEcGT" rel="noreferrer" target="_blank">
        <Fa icon={faDiscord} />
      </a>
      <a href="https://www.youtube.com/@pocketba5ed" rel="noreferrer" target="_blank">
        <Fa icon={faYoutube} />
      </a>
    </div>
  </div>
  <div class="flex-none">
    <NavbarMenu />
  </div>
</div>
