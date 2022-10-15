<script lang="ts">
  import { browser } from '$app/environment'
  import { client } from '$src/pocketbase'
  import { redirect } from '$util/redirect'

  if (browser && client.isLoggedIn()) {
    redirect(`/dashboard`)
  }
</script>

<slot />
