<script lang="ts">
  import AuthStateGuard from '$components/helpers/AuthStateGuard.svelte'
  import HomepageHeroAnimation from '$components/HomepageHeroAnimation.svelte'
  import InstanceGeneratorWidget from '$components/InstanceGeneratorWidget.svelte'
  import { isUserLoggedIn } from '$util/stores'
</script>

<svelte:head>
  <title>Home - PocketHost</title>
</svelte:head>

<div class="container">
  <div class="row align-items-center justify-content-between hero">
    <div class="col-lg-6 mb-5 mb-lg-0">
      <h2>Deploy <span>PocketBase</span> in 30 seconds</h2>

      <p class="mb-5">
        Spend less time on configuring your backend, and more time building new
        features for your web app.
      </p>

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

    <div class="col-lg-5 d-none d-sm-block">
      <HomepageHeroAnimation />
    </div>
  </div>
</div>

<style>
  .hero {
    padding: 50px 0;
  }

  .hero h2 {
    font-size: 35px;
  }

  .hero h2 span {
    background-image: linear-gradient(
      83.2deg,
      rgba(150, 93, 233, 1) 10.8%,
      rgba(99, 88, 238, 1) 94.3%
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .features {
    background-image: var(--gradient-white-lime);
  }

  .section {
    padding: 120px 0;
  }
  .section h2 {
    font-size: 56px;
  }

  @media screen and (min-width: 768px) {
    .hero {
      padding: 100px 0;
    }

    .hero h2 {
      font-size: 65px;
    }
  }
</style>
