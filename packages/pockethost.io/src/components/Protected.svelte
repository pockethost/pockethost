<script lang="ts">
  import { browser } from '$app/environment'
  import { redirect } from '$util/redirect'
  import { isLoggedIn } from '@pockethost/common/src/pocketbase'

  if (browser && !isLoggedIn()) {
    redirect(`/signup`)
  }
</script>

<slot />

<style lang="scss">
</style>
