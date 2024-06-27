<script lang="ts">
  import { page } from '$app/stores'
  import UserLoggedIn from '$components/helpers/UserLoggedIn.svelte'
</script>

<UserLoggedIn redirect>
  <div class="text-xl">My Account</div>
  <div role="tablist" class="tabs tabs-bordered gap-4 mb-4 p-4">
    <a
      role="tab"
      class="tab h-auto md:h-8 flex gap-2 font-bold {$page.url.pathname.endsWith(
        `account`,
      )
        ? `tab-active`
        : ``}"
      href="/account"><i class="fa-light fa-sparkles"></i> Membership</a
    >
    <a
      role="tab"
      class="tab h-auto md:h-8 flex gap-2 font-bold {$page.url.pathname.endsWith(
        `notifications`,
      )
        ? `tab-active`
        : ``}"
      href="/account/notifications"
      ><i class="fa-light fa-gear"></i> Notifications</a
    >
  </div>

  <slot />
</UserLoggedIn>
