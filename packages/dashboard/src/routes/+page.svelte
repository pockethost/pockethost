<script lang="ts">
  import Logo from '$components/Logo.svelte'
  import AuthStateGuard from '$components/helpers/AuthStateGuard.svelte'
  import InstanceGeneratorWidget from '$components/login-register/InstanceGeneratorWidget.svelte'
  import { isUserLoggedIn } from '$util/stores'
</script>

<svelte:head>
  <title>Home - PocketHost</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center">
  <div>
    <AuthStateGuard>
      <Logo />

      {#if $isUserLoggedIn}
        <div class="">
          <a href="/dashboard" class="btn btn-primary"
          >Go to Your Dashboard <i class="bi bi-arrow-right-short" /></a
          >
        </div>
      {/if}

      {#if !$isUserLoggedIn}
        <InstanceGeneratorWidget />
      {/if}
    </AuthStateGuard>
  </div>
</div>

