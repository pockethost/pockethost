<script lang="ts">
  import AuthStateGuard from '$components/helpers/AuthStateGuard.svelte'
  import InstanceGeneratorWidget from '$components/InstanceGeneratorWidget.svelte'
  import { isUserLoggedIn } from '$util/stores'
</script>

<svelte:head>
  <title>Home - PocketHost</title>
</svelte:head>

<div class="container">
  <div class="row align-items-center justify-content-between hero">
    <div class="col-lg-6 mb-5 mb-lg-0">
      <AuthStateGuard>
        {#if $isUserLoggedIn}
          <div>
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
</div>
