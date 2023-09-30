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
  <Navbar />
{/if}

<AuthStateGuard>
  <VerifyAccountBar />
</AuthStateGuard>

<div>
  <slot />
</div>
