<script lang="ts">
  import Logo from '$components/Logo.svelte'
  import UserLoggedIn from '$components/helpers/UserLoggedIn.svelte'
  import UserLoggedOut from '$components/helpers/UserLoggedOut.svelte'
  import InstanceGeneratorWidget from '$components/login-register/InstanceGeneratorWidget.svelte'
  import Dashboard from './dashboard/Dashboard.svelte'
</script>

<svelte:head>
  <title>Home - PocketHost</title>
</svelte:head>

<div>
  <UserLoggedIn>
    <Dashboard />
  </UserLoggedIn>

  <UserLoggedOut>
    <div class="min-h-screen flex items-center justify-center">
      <div>
        <Logo />
        <InstanceGeneratorWidget />
      </div>
    </div>
  </UserLoggedOut>
</div>
