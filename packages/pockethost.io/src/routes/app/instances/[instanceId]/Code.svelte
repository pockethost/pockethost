<script lang="ts">
  import CodeSample from '$components/CodeSample.svelte'
  import { PUBLIC_APP_DOMAIN, PUBLIC_APP_PROTOCOL } from '$src/env'
  import type { InstanceFields } from '@pockethost/common'

  export let instance: InstanceFields

  const { subdomain } = instance
  const url = `${PUBLIC_APP_PROTOCOL}://${subdomain}.${PUBLIC_APP_DOMAIN}`
  const code = `const url = '${url}'\nconst client = new PocketBase(url)`
</script>

<div class="py-4">
  <h2>Code Samples</h2>
  <div>
    JavaScript:
    <CodeSample {code} />
  </div>
</div>
