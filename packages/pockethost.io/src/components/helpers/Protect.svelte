<script lang="ts">
  import { client } from '$src/pocketbase'
  import { warn } from '$util/logger'
  import publicRoutes from '$util/public-routes.json'
  import { getRouter } from '$util/utilities'
  import { onMount } from 'svelte'
  onMount(() => {
    const { isLoggedIn } = client()
    if (isLoggedIn()) return
    // Send user to the homepage
    const router = getRouter()

    const { pathname } = router
    if (!publicRoutes.includes(pathname)) {
      warn(`${pathname} is a private route`)
      window.location.href = '/'
    }
  })
</script>
