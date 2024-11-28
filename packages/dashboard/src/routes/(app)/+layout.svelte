<script>
  import UserLoggedIn from '$components/guards/UserLoggedIn.svelte'
  import UserLoggedOut from '$components/guards/UserLoggedOut.svelte'
</script>

<div class="m-4">
  <UserLoggedIn>
    <slot />
  </UserLoggedIn>
  <UserLoggedOut>
    <p>
      You must be <a href="/login" class="link">logged in</a> to access this area.
    </p>
  </UserLoggedOut>
</div>
