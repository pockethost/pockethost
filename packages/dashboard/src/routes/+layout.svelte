<script>
  import Navbar from '$components/Navbar.svelte'
  import VerifyAccountBar from '$components/VerifyAccountBar.svelte'
  import AuthStateGuard from '$components/helpers/AuthStateGuard.svelte'
  import Meta from '$components/helpers/Meta.svelte'
  import Protect from '$components/helpers/Protect.svelte'
  import '../app.css'

  import { isUserLoggedIn } from '$util/stores'
</script>

<Meta />
<Protect />


{#if $isUserLoggedIn}
  <AuthStateGuard>
    <VerifyAccountBar />
  </AuthStateGuard>

  <div class='layout flex'>
    <Navbar />

    <div class='p-4 min-h-screen grow'>
      <div class='bg-base-300 border-base-300 border-[16px] h-[calc(100vh-32px)] p-4 rounded-2xl overflow-hidden overflow-y-auto'>
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