<script lang="ts">
  import { isMothershipReachable } from '$util/stores'
</script>

{#if !$isMothershipReachable}
  <div class="bg-error text-error-content p-4 rounded-none">
    <div class="text-center">
      <h2 class="text-xl font-bold mb-2">Connection Lost</h2>
      <p>
        The PocketHost mothership is temporarily unreachable. Your instances are
        safe and still reachable. Go to the <a
          href="https://status.pockethost.io"
          class="link font-semibold underline">status page</a
        > for more information.
      </p>
    </div>
  </div>
{/if}
