<script lang="ts">
  import { browser } from '$app/environment'
  import { client } from '$src/pocketbase'
  import { goto } from '$app/navigation'

  const { isLoggedIn } = client

  if (browser && !isLoggedIn()) {
    goto(`/signup`)
  }
</script>

<slot />

<style lang="scss">
</style>
