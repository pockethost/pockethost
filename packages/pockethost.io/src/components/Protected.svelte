<script lang="ts">
  import { browser } from '$app/environment'
  import { client } from '$src/pocketbase'
  import { redirect } from '$util/redirect'

  const { isLoggedIn } = client

  if (browser && !isLoggedIn()) {
    redirect(`/signup`)
  }
</script>

<slot />

<style lang="scss">
</style>
