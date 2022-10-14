<script lang="ts">
  import { client } from '$src/pocketbase'
  import { redirect } from '$util/redirect'

  const { isLoggedIn, logOut } = client

  const handleLogout = (e) => {
    e.preventDefault()
    logOut()
    redirect(`/`)
  }
</script>

<header class="container-fluid">
  <nav class="navbar navbar-expand-lg">
    <a href="/" class="logo text-decoration-none d-flex align-items-center">
      <img src="/images/logo-square.png" alt="PocketHost Logo" class="img-fluid" />
      <!--<Title size={TitleSize.Nav} first="pocket" second="host" third=".io" />-->
      <h1>Pocket<span>Host</span></h1>
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
      <ul class="navbar-nav ms-auto mb-2 mb-lg-0">
        {#if isLoggedIn()}
          <li class="nav-item">
            <a class="nav-link" href="/dashboard">Dashboard</a>
          </li>

          <li class="nav-item dropdown">
            <a
              class="nav-link"
              href="#"
              role="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <i class="bi bi-person-circle" />
            </a>

            <ul class="dropdown-menu dropdown-menu-end">
              <li><a class="dropdown-item" href="#">Profile</a></li>
              <li><a class="dropdown-item" href="#">Settings</a></li>
              <li><hr class="dropdown-divider" /></li>
              <li><a class="dropdown-item" href="#" on:click={handleLogout}>Logout</a></li>
            </ul>
          </li>
        {/if}

        {#if !isLoggedIn()}
          <li class="nav-item">
            <a class="nav-link" href="/signup">Sign up</a>
          </li>

          <li class="nav-item">
            <a class="nav-link" href="/login">Log in</a>
          </li>
        {/if}

        <li class="nav-item">
          <a
            class="nav-link"
            href="https://github.com/benallfree/pockethost"
            target="_blank"
            rel="noopener"
          >
            <i class="bi bi-github" />
          </a>
        </li>
      </ul>
    </div>
  </nav>
</header>

<style lang="scss">
  header {
    background-color: #fff;
    padding: 12px 24px;
    border-bottom: 1px solid #eee;
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
      color: #222;

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
  }

  .mobile-nav-button {
    font-size: 20px;
  }

  .nav-link {
    font-weight: 500;
  }
</style>
