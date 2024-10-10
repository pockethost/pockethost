<script lang="ts">
  import { assertExists } from 'pockethost/common'
  import Code from './Overview.svelte'
  import Ftp from './ftp/+page.svelte'
  import { instance } from './store'

  $: ({ status, version, id } = $instance)

  assertExists($instance, `Expected instance here`)
  const { subdomain } = $instance
</script>

<Code />
