<script lang="ts">
  import { isLoggedIn, logOut, user } from '@pockethost/common/src/pocketbase'
  import Button from './Button/Button.svelte'
  import { ButtonStyles } from './Button/types'

  if (typeof window !== 'undefined' && !isLoggedIn()) {
    window.location.href = '/signup'
  }

  const handleLogout = () => {
    logOut()
    window.location.href = '/'
  }
</script>

<div class="logbar">
  {user()?.email}
  <Button style={ButtonStyles.Micro} click={handleLogout}>Log Out</Button>
  <div>
    <a href="/dashboard">dashboard</a>
  </div>
</div>
<slot />

<style lang="scss">
  .logbar {
    position: absolute;
    right: 0px;
    top: 0px;
  }
</style>
