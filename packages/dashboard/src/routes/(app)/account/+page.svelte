<script lang="ts">
  import { userSubscriptionType } from '$util/stores'
  import { PLAN_NAMES, SubscriptionType } from 'pockethost'
  import { userStore } from '$util/stores'
  import { onMount } from 'svelte'
  import FlounderCard from './FlounderCard.svelte'
  import Avatar from '$src/routes/Navbar/Avatar.svelte'
</script>

<div class="text-xl">My Account</div>
<div>
  <Avatar class="w-5 h-5" />
  Change your avatar on
  <a href="https://gravatar.com/profile" class="link">Gravatar</a>
</div>
<div>
  Your plan: <span class="text-success font-bold"
    >{PLAN_NAMES[$userSubscriptionType]}</span
  >
</div>
<div>
  Need to change or cancel? <a href="/support" class="link">Contact support</a>
</div>
<div class="w-[300px] m-4">
  <FlounderCard />
</div>
