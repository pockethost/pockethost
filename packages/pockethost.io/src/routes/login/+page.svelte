<script lang="ts">
  import {handleLogin} from "$util/database";
  import AlertBar from "$components/AlertBar.svelte";

  let email: string = "";
  let password: string = "";
  let formError: string = "";

  let isFormButtonDisabled: boolean = true;
  $: isFormButtonDisabled = email.length === 0 || password.length === 0;

  const handleSubmit = async(e) => {
    e.preventDefault();

    isFormButtonDisabled = true;

    await handleLogin(email, password, (error) => {
      formError = error;
    });

    isFormButtonDisabled = false;
  }
</script>


<div class="page-bg">
  <div class="card">
    <h2 class="mb-4">Login</h2>

    <form on:submit={handleSubmit}>
      <div class="form-floating mb-3">
        <input
          type="email"
          class="form-control"
          id="email"
          placeholder="name@example.com"
          bind:value={email}
          required
          autocomplete="email" />
        <label for="email">Email address</label>
      </div>

      <div class="form-floating mb-3">
        <input
          type="password"
          class="form-control"
          id="password"
          placeholder="Password"
          bind:value={password}
          required
          autocomplete="current-password" />
        <label for="password">Password</label>
      </div>

      {#if formError}
        <AlertBar icon="bi bi-exclamation-triangle-fill" text={formError} />
      {/if}

      <button type="submit" class="btn btn-primary w-100" disabled={isFormButtonDisabled}>
        Log In <i class="bi bi-arrow-right-short"></i>
      </button>
    </form>

    <div class="py-4"><hr/></div>

    <div class="text-center">
      Need to <a href="/signup">create an account</a>?
    </div>
  </div>
</div>



<style lang="scss">
  .page-bg {
    background-color: #222;
    background-image: linear-gradient( 109.6deg,  rgba(125,89,252,1) 11.2%, rgba(218,185,252,1) 91.1% );
    display: flex;
    align-items: center;
    justify-content: center;
    height: calc(100vh - 91px);
    padding: 0 18px;
  }

  .card {
    border: 0;
    background-color: #fff;
    box-shadow: rgba(100, 100, 111, 0.2) 0px 7px 29px 0px;
    padding: 24px;
    max-width: 425px;
    width: 100%;
    border-radius: 24px;
  }

  @media screen and (min-width: 768px) {
    .card {
      padding: 48px;
    }
  }
</style>