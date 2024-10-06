<script>
  import UserLoggedIn from '$components/helpers/UserLoggedIn.svelte'
  import UserLoggedOut from '$src/components/helpers/UserLoggedOut.svelte'
</script>

<UserLoggedIn>
  <slot />
</UserLoggedIn>
<UserLoggedOut>
  <p>
    You must be <a href="/get-started" class="link">logged in</a> to access this
    area.
  </p>
</UserLoggedOut>
