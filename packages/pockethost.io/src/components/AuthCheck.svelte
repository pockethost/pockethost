<script lang="ts">
  import { browser } from '$app/environment'
  import { client } from '$src/pocketbase'
  import { goto } from '$app/navigation'

  if (browser && client.isLoggedIn()) {
    goto(`/dashboard`)
  }
</script>

<slot />
