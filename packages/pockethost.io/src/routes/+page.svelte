<script lang="ts">
  import FeatureCard from '$components/FeatureCard.svelte'
  import AuthStateGuard from '$components/helpers/AuthStateGuard.svelte'
  import HomepageHeroAnimation from '$components/HomepageHeroAnimation.svelte'
  import InstanceGeneratorWidget from '$components/InstanceGeneratorWidget.svelte'
  import { PUBLIC_APP_DOMAIN } from '$src/env'
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
        Spend less time on configuring your backend, and more time building new features for your
        web app.
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

<div class="section features">
  <div class="container">
    <h2 class="mb-5">Features</h2>

    <div class="row">
      <div class="col-12 col-md-6 col-lg-4 mb-4">
        <FeatureCard title="Up in 30 seconds" icon="bi bi-stopwatch" fullHeight={true}>
          <p>
            A backend for your next app is as fast as signing up. No provisioning servers, no Docker
            fiddling, just B(ad)aaS productivity.
          </p>

          <ul>
            <li>Sign up</li>
            <li>Pick a unique project name</li>
            <li>Connect with our JS client</li>
          </ul>
        </FeatureCard>
      </div>

      <div class="col-12 col-md-6 col-lg-4 mb-4">
        <FeatureCard title="Zero Config" icon="bi bi-check-lg" fullHeight={true}>
          <p>
            With PocketHost, batteries are included. You get a database, outgoing email, SSL,
            authentication, cloud functions, and high concurrency all in one stop.
          </p>
        </FeatureCard>
      </div>

      <div class="col-12 col-md-6 col-lg-4 mb-4">
        <FeatureCard title="Database" icon="bi bi-hdd-stack" fullHeight={true}>
          <p>
            Your PocketHost instance is powered by its own internal SQLite instance. SQLite is <a
              href="https://pocketbase.io/faq/"
              target="_blank">more performant than mySQL or Postgres</a
            >
            and is
            <a href="https://www.sqlite.org/whentouse.html" target="_blank"
              >perfect for powering your next app</a
            >.
          </p>
        </FeatureCard>
      </div>

      <div class="col-12 col-md-6 col-lg-3 mb-4">
        <FeatureCard title="Auth" icon="bi bi-shield-lock" fullHeight={true}>
          <p>
            Email and oAuth authentication options work out of the box. Send transactional email to
            your users from our verified domain and your custom address <code
              >yoursubdomain@{PUBLIC_APP_DOMAIN}</code
            >.
          </p>
        </FeatureCard>
      </div>

      <div class="col-12 col-md-6 col-lg-3 mb-4">
        <FeatureCard title="Storage" icon="bi bi-archive" fullHeight={true}>
          <p>
            PocketHost securely stores your files on Amazon S3, or you can use your own key to
            manage your own storage.
          </p>
        </FeatureCard>
      </div>

      <div class="col-12 col-md-6 col-lg-3 mb-4">
        <FeatureCard title="Room to Grow" icon="bi bi-cloud-arrow-up" fullHeight={true}>
          <p>PocketHost is perfect for hobbist, low, and medium volume sites and apps.</p>
          <p>
            PocketHost, and the underlying PocketBase, can scale to well over 10,000 simultaneous
            connections.
          </p>
        </FeatureCard>
      </div>

      <div class="col-12 col-md-6 col-lg-3 mb-4">
        <FeatureCard title="Self-host" icon="bi bi-house-door" fullHeight={true}>
          <p>
            When you're ready to take your project in-house, we have you covered. You can export
            your entire PocketHost environment along with a Dockerfile to run it.
          </p>
        </FeatureCard>
      </div>

      <div class="col-12 col-md-6 col-lg-6 mb-4">
        <FeatureCard title="Open Source Stack" icon="bi bi-code-slash" fullHeight={true}>
          <p>
            PocketHost is powered by Svelte, Vite, Typescript, PocketBase, and SQLite. Because the
            entire stack is open source, you'll never be locked into the whims of a vendor.
          </p>
        </FeatureCard>
      </div>

      <div class="col-12 col-md-6 col-lg-6 mb-4">
        <FeatureCard title="Coming Soon" icon="bi bi-card-checklist" fullHeight={true}>
          <ul>
            <li>JS/TS cloud functions</li>
            <li>Deploy to Fly.io</li>
            <li>Litestream</li>
          </ul>
        </FeatureCard>
      </div>
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

  .section{
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
