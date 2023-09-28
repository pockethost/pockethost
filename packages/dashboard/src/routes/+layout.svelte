<script>
  import Navbar from '$components/Navbar.svelte'
  import VerifyAccountBar from '$components/VerifyAccountBar.svelte'
  import AuthStateGuard from '$components/helpers/AuthStateGuard.svelte'
  import Meta from '$components/helpers/Meta.svelte'
  import Protect from '$components/helpers/Protect.svelte'
  import '../app.css'
</script>

<Meta />
<Protect />

<Navbar />

<AuthStateGuard>
  <VerifyAccountBar />
</AuthStateGuard>

<div class="container">
  <slot />
</div>
