<script>
  import { client } from '$src/pocketbase'
	import { LocalAuthStore } from 'pocketbase';
  import { globalUserData } from '$util/stores'
  import { onMount } from 'svelte'
  import { getRouter } from '$util/utilities'
  import publicRoutes from '$util/public-routes.json'

  const { refreshUserData } = client

  onMount(async () => {
    try {
      // First check if the user even has a token
      const doesUserTokenExist = localStorage.getItem('pocketbase_auth')

      if (doesUserTokenExist === null) {
        throw new Error('User has not logged in yet')
      }

      // Verify the user's token on page load
      const response = await refreshUserData()

      // Set the global state if successful
      await globalUserData.set(response)
    } catch (error) {
      // Either the token is invalid, or the database is down.
      console.warn('Warning: ', error)

      // Clear the token from local storage
      LocalAuthStore.clear();

      // Send user to the homepage
      const router = getRouter()

      if (!publicRoutes.includes(router.pathname)) {
        window.location.href = '/?message=invalid-token'
      }
    }
  })
</script>
