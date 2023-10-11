<script lang="ts">
  import { PUBLIC_ROUTES } from '$src/env'
  import { client } from '$src/pocketbase'
  import { getRouter } from '$util/utilities'
  import { LoggerService } from '@pockethost/common'
  import { onMount } from 'svelte'

  onMount(() => {
    const { isLoggedIn } = client()
    if (isLoggedIn()) return
    const router = getRouter()

    const { pathname } = router
    if (!PUBLIC_ROUTES.find((matcher) => matcher.match(pathname))) {
      const { warn } = LoggerService()
      // Send user to the homepage
      warn(`${pathname} is a private route`)
      window.location.href = '/'
    }
  })
</script>
