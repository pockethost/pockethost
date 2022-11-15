<script lang="ts">
  import CodeSample from '$components/CodeSample.svelte'
  import { PUBLIC_PB_PROTOCOL } from '$env/static/public'
  import { PUBLIC_PB_DOMAIN } from '$src/env'
  import { instance } from '../store'

  const { subdomain, status, platform, version } = $instance
  const url = `${PUBLIC_PB_PROTOCOL}://${subdomain}.${PUBLIC_PB_DOMAIN}`
  const code = `const url = '${url}'\nconst client = new PocketBase(url)`
</script>

<div class="py-4">
  <h2>Code Samples</h2>
  <div>
    JavaScript:
    <CodeSample {code} />
  </div>
</div>
