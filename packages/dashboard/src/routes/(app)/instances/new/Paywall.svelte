<script lang="ts">
  import { userStore } from '$util/stores'

  $: maxInstances = $userStore?.subscription_quantity || 0
</script>

<wa-card class="max-w-sm bg-[#111111]/80 border border-white/10 shadow-md">
  <div class="wa-card-body">
    <h2 class="text-xl font-bold mb-2">Paywall!</h2>
    <p>Oof. You hit a paywall because you are out of instances.</p>
    <div class="w-full mt-6">
      <wa-button href="/access" variant="brand" class="w-full">Unlock more</wa-button>
    </div>
  </div>
</wa-card>
