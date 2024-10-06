<script lang="ts">
  import { userSubscriptionType } from '$util/stores'
  import { PLAN_NAMES } from 'pockethost'
</script>

<div>
  Your plan: <span class="text-success font-bold"
    >{PLAN_NAMES[$userSubscriptionType]}</span
  >
</div>
<div>
  Need to change or cancel? <a href="/support" class="link">Contact support</a>
</div>
