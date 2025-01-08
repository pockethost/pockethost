<script lang="ts">
  import { userSubscriptionType } from '$util/stores'
  import { PLAN_NAMES, SubscriptionType } from 'pockethost/common'
  import { userStore } from '$util/stores'
  import Avatar from '$src/routes/Navbar/Avatar.svelte'
</script>

<div class="p-4">
  <div class="text-2xl m-4">My Account</div>

  <div class="m-4">
    Your email: <span class="text-success font-bold">{$userStore?.email}</span>
  </div>
  <div class="m-4">
    Your plan: <span class="text-success font-bold"
      >{PLAN_NAMES[$userSubscriptionType]}</span
    >
  </div>
  <div>
    <a class="m-4 btn btn-neutral" href="https://gravatar.com/profile">
      <Avatar class="w-5 h-5" />
      Update Avatar
    </a>
  </div>

  <div>
    <a class="m-4 btn btn-neutral" href="/support"> Manage Membership </a>
  </div>
</div>
