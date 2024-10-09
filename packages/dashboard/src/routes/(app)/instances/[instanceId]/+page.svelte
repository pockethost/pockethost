<script lang="ts">
  import { assertExists } from 'pockethost/common'
  import Code from './Overview.svelte'
  import { instance } from './store'

  assertExists($instance, `Expected instance here`)
</script>

<Code />
