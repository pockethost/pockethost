<script lang="ts">
  import { assertExists } from '@pockethost/server/common'
  import Code from './Overview.svelte'
  import { instance } from './store'

  assertExists($instance, `Expected instance here`)
</script>

<Code />
