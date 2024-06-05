<script>
  import UserLoggedIn from '$components/helpers/UserLoggedIn.svelte'
</script>

<UserLoggedIn redirect>
  <slot />
</UserLoggedIn>
