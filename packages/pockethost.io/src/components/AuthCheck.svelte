<script lang="ts">
  import { isLoggedIn, user } from '@pockethost/common/src/pocketbase'
  import Button from './Button/Button.svelte'

  if (typeof window !== 'undefined' && isLoggedIn()) {
    window.location.href = '/dashboard'
  }
</script>

<slot />
