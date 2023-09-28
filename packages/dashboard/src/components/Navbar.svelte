<script lang="ts">
  import ThemeToggle from '$components/ThemeToggle.svelte'
  import { PUBLIC_POCKETHOST_VERSION } from '$src/env'
  import { handleLogoutAndRedirect } from '$util/database'
  import { isUserLoggedIn } from '$util/stores'
</script>

<div class="navbar bg-base-100">
  <div class="flex-1">
    <a href="/" class="logo text-decoration-none d-flex align-items-center">
      <img
        src="/images/logo-square.png"
        alt="PocketHost Logo"
        class="img-fluid"
      />
      <h1>Pocket<span>Host</span></h1>
      <sup class="">{PUBLIC_POCKETHOST_VERSION}</sup>
    </a>
  </div>
  <div class="flex-none">
    <ul class="menu menu-horizontal px-1">
      {#if !$isUserLoggedIn}
        <li>
          <a href="/signup">Sign up</a>
        </li>

        <li>
          <a href="/login">Log in</a>
        </li>
      {/if}
      <li>
        <a
          href="https://github.com/benallfree/pockethost/discussions"
          target="_blank"
          rel="noreferrer">Discussion</a
        >
      </li>
      <li>
        <a href="https://pockethost.io/docs" rel="noreferrer">Docs</a>
      </li>

      {#if $isUserLoggedIn}
        <li>
          <a type="button" on:click={handleLogoutAndRedirect}>Logout</a>
        </li>
      {/if}

      <li>
        <ThemeToggle navLink={true} />
      </li>
      <li>
        <a
          href="https://github.com/benallfree/pockethost"
          target="_blank"
          aria-label="Link to our Github Project"
          title="Link to our Github Project"
          rel="noopener"
        >
          github
        </a>
      </li>
    </ul>
  </div>
</div>

<style lang="scss">
  .logo {
    img {
      max-width: 50px;
      margin-right: 16px;
      display: inline-block;
    }

    h1 {
      font-size: 36px;
      font-weight: 300;
      margin: 0;
      color: var(--bs-body-color);
      display: inline-block;
      position: relative;
      top: 10px;

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
</style>
