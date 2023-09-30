<script lang="ts">
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
      <div class='flex items-center justify-center gap-4'>
        <img src="/images/pockethost-cloud-logo.jpg" width='450' height='450' class="mix-blend-lighten w-24" alt="PocketHost Logo" />
        <h1 class="text-white font-bold text-2xl">PocketHost</h1>
      </div>

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

