<script lang="ts">
  import { userStore } from '$util/stores'
  import UserLoggedIn from '$components/guards/UserLoggedIn.svelte'
  import UserLoggedOut from '$components/guards/UserLoggedOut.svelte'

  export let fixed = false
</script>

<UserLoggedIn>
  <a
    class="btn btn-warning btn-lg {fixed
      ? ' btn-block rounded-none fixed bottom-0'
      : ''}"
    style="z-index: 1000"
    href={`https://store.pockethost.io/buy/d4b2d062-429c-49b4-9cdc-853aaeb17e20?checkout[custom][user_id]=${$userStore?.id}&checkout[email]=${$userStore?.email}`}
    >Unlock Access Now</a
  >
</UserLoggedIn>
<UserLoggedOut>
  <a
    class="btn btn-warning btn-lg {fixed
      ? ' btn-block rounded-none fixed bottom-0'
      : ''}"
    href="/get-started">Get Started</a
  >
</UserLoggedOut>
