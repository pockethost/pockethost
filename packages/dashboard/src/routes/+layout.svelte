<script>
  import MediaQuery from '$components/MediaQuery.svelte'
  import MobileNavDrawer from '$components/MobileNavDrawer.svelte'
  import Navbar from '$components/Navbar.svelte'
  import Meta from '$components/helpers/Meta.svelte'
  import Protect from '$components/helpers/Protect.svelte'
  import '../app.css'
  import '../services'

  import { getInstances } from '$util/getInstances'
  import { isUserLoggedIn } from '$util/stores'

  getInstances()
</script>

<Meta />
<Protect />

{#if $isUserLoggedIn}
  <div class="layout xl:flex">
    <MediaQuery query="(min-width: 1280px)" let:matches>
      {#if matches}
        <Navbar />
      {:else}
        <MobileNavDrawer>
          <Navbar />
        </MobileNavDrawer>
      {/if}
    </MediaQuery>

    <div class="lg:p-4 lg:pt-0 xl:pt-4 min-h-screen grow">
      <div
        class="bg-base-300 border-base-300 border-[16px] xl:h-[calc(100vh-32px)] lg:p-4 rounded-2xl xl:overflow-hidden xl:overflow-y-auto"
      >
        <slot />
      </div>
    </div>
  </div>
{/if}

{#if !$isUserLoggedIn}
  <div>
    <slot />
  </div>
{/if}
