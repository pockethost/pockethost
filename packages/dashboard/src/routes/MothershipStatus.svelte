<script lang="ts">
  import { isMothershipReachable } from '$util/stores'
</script>

{#if !$isMothershipReachable}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div class="alert alert-error max-w-2xl mx-4">
      <div class="text-center">
        <h2 class="text-xl font-bold mb-2">Connection Lost</h2>
        <p>
          The PocketHost mothership is temporarily unreachable. Your instances
          are safe and still reachable. Go to the <a
            href="https://status.pockethost.io"
            class="link font-semibold underline">status page</a
          > for more information.
        </p>
      </div>
    </div>
  </div>
{/if}
