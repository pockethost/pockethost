<script lang="ts">
  import { browser } from '$app/environment'
  import { goto } from '$app/navigation'
  import { client } from '$src/pocketbase'

  if (browser && client().isLoggedIn()) {
    goto(`/dashboard`)
  }
</script>

<slot />
