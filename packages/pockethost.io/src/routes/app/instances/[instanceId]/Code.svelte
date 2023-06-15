<script lang="ts">
  import CodeSample from '$components/CodeSample.svelte'
  import { PUBLIC_APP_DOMAIN, PUBLIC_APP_PROTOCOL } from '$src/env'
  import type { InstanceFields } from '@pockethost/common'
  import AccordionItem from './AccordionItem.svelte'

  export let instance: InstanceFields

  const { subdomain } = instance
  const url = `${PUBLIC_APP_PROTOCOL}://${subdomain}.${PUBLIC_APP_DOMAIN}`
  const code = `const url = '${url}'\nconst client = new PocketBase(url)`
</script>

<AccordionItem title="Code Samples">
  JavaScript:
  <CodeSample {code} />
</AccordionItem>
