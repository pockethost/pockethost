<script>
  import UserLoggedIn from '$components/helpers/UserLoggedIn.svelte'
  import UserLoggedOut from '$src/components/helpers/UserLoggedOut.svelte'
</script>

<div class="m-4">
  <UserLoggedIn>
    <slot />
  </UserLoggedIn>
  <UserLoggedOut>
    <p>
      You must be <a href="/get-started" class="link">logged in</a> to access this
      area.
    </p>
  </UserLoggedOut>
</div>
