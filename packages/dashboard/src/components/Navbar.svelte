<script lang="ts">
  import MediaQuery from '$components/MediaQuery.svelte'
  import ThemeToggle from '$components/ThemeToggle.svelte'
  import { PUBLIC_POCKETHOST_VERSION } from '$src/env'
  import { handleLogoutAndRedirect } from '$util/database'
  import { isUserLoggedIn } from '$util/stores'
  import AuthStateGuard from './helpers/AuthStateGuard.svelte'
</script>

<header class="container-fluid">
  <nav class="navbar navbar-expand-md">
    <a href="/" class="logo text-decoration-none d-flex align-items-center">
      <img src="/images/logo-square.png" alt="PocketHost Logo" class="img-fluid" />
      <h1>Pocket<span>Host</span></h1>
      <sup class="">{PUBLIC_POCKETHOST_VERSION}</sup>
    </a>

    <button
      class="btn btn-light mobile-nav-button navbar-toggler"
      type="button"
      data-bs-toggle="collapse"
      data-bs-target="#nav-links"
      aria-controls="nav-links"
      aria-expanded="false"
      aria-label="Toggle navigation"
    >
      <i class="bi bi-list" />
    </button>

    <div class="collapse navbar-collapse" id="nav-links">
      <ul class="navbar-nav ms-auto mb-2 mb-md-0">
        <AuthStateGuard>
          {#if $isUserLoggedIn}
            <li class="nav-item text-md-start text-center">
              <a class="nav-link" href="/dashboard">Dashboard</a>
            </li>

            <MediaQuery query="(min-width: 768px)" let:matches>
              {#if matches}
                <li class="nav-item dropdown">
                  <button
                    class="btn border-0 nav-link dropdown-toggle"
                    type="button"
                    data-bs-toggle="dropdown"
                    aria-label="Click to expand the Account Dropdown"
                    title="Account Dropdown"
                    aria-expanded="false"
                  >
                    Account
                  </button>

                  <ul class="dropdown-menu dropdown-menu-end">
                    <li>
                      <button class="dropdown-item" type="button" on:click={handleLogoutAndRedirect}
                        >Logout</button
                      >
                    </li>
                  </ul>
                </li>
              {:else}
                <li class="nav-item">
                  <a
                    class="nav-link text-md-start text-center"
                    href="/"
                    on:click={handleLogoutAndRedirect}>Logout</a
                  >
                </li>
              {/if}
            </MediaQuery>
          {/if}

          {#if !$isUserLoggedIn}
            <li class="nav-item">
              <a class="nav-link text-md-start text-center" href="/signup">Sign up</a>
            </li>

            <li class="nav-item">
              <a class="nav-link text-md-start text-center" href="/login">Log in</a>
            </li>
          {/if}
        </AuthStateGuard>

        <li class="nav-item text-center">
          <a
            href="https://pockethost.gitbook.io/manual/overview/faq"
            class="nav-link btn btn-outline-dark rounded-1 d-inline-block px-3"
            rel="noreferrer">FAQ</a
          >
        </li>

        <li class="nav-item text-center">
          <a
            href="https://github.com/benallfree/pockethost/discussions"
            class="nav-link btn btn-outline-dark rounded-1 d-inline-block px-3"
            target="_blank"
            rel="noreferrer">Support</a
          >
        </li>

        <li class="nav-item text-center">
          <a
            href="https://pockethost.gitbook.io/manual/"
            class="nav-link btn btn-outline-dark rounded-1 d-inline-block px-3"
            rel="noreferrer">Docs</a
          >
        </li>

        <li class="nav-item">
          <a
            class="nav-link text-md-start text-center"
            href="https://github.com/benallfree/pockethost"
            target="_blank"
            aria-label="Link to our Github Project"
            title="Link to our Github Project"
            rel="noopener"
          >
            <i class="bi bi-github" /><span class="nav-github-link">Github</span>
          </a>
        </li>

        <li class="nav-item text-center">
          <ThemeToggle navLink={true} />
        </li>
      </ul>
    </div>
  </nav>
</header>

<style lang="scss">
  header {
    background-color: var(--bs-body-bg);
    padding: 12px 24px;
    border-bottom: 1px solid var(--bs-gray-300);
  }

  .logo {
    img {
      max-width: 50px;
      margin-right: 16px;
    }

    h1 {
      font-size: 36px;
      font-weight: 300;
      margin: 0;
      color: var(--bs-body-color);

      span {
        font-weight: 700;
        background-image: linear-gradient(
          83.2deg,
          rgba(150, 93, 233, 1) 10.8%,
          rgba(99, 88, 238, 1) 94.3%
        );
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
    }

    sup {
      margin-left: 4px;
      font-size: 12px;
      font-weight: 700;
      color: var(--bs-gray-600);
    }
  }

  .mobile-nav-button {
    font-size: 20px;
  }

  .nav-item {
    margin: 8px 0;
  }

  .nav-link {
    font-weight: 500;
    margin: 0 5px;
  }

  .nav-github-link {
    display: inline-block;
    margin-left: 4px;
  }

  @media screen and (min-width: 768px) {
    .nav-github-link {
      display: none;
    }

    .nav-item {
      margin: 0;
    }
  }
</style>
