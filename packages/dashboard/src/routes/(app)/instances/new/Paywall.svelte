<script lang="ts">
  import { userStore } from '$util/stores'

  $: maxInstances = $userStore?.subscription_quantity || 0
</script>

<wa-card class="max-w-sm bg-[#111111]/80 border border-white/10 shadow-md">
  <div class="wa-card-body">
    <h2 class="text-xl font-bold mb-2">Paywall!</h2>
    <p>
      You need a paid PocketBase slot to create instances. Each $5/month slot adds pooled storage and one powered-on
      instance.
    </p>
    <div class="w-full mt-6">
      <wa-button href="/pricing" variant="brand" class="w-full">Pay Per PocketBase</wa-button>
    </div>
  </div>
</wa-card>
