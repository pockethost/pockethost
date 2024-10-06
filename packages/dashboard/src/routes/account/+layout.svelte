<script lang="ts">
  import { page } from '$app/stores'
  import UserLoggedIn from '$components/helpers/UserLoggedIn.svelte'
</script>

<UserLoggedIn redirect>
  <div class="text-xl">My Account</div>
  <slot />
</UserLoggedIn>
