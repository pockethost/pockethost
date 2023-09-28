<script lang="ts">
  import AccordionItem from '$components/AccordionItem.svelte'
  import CodeSample from '$components/CodeSample.svelte'
  import { PUBLIC_APP_DOMAIN, PUBLIC_APP_PROTOCOL } from '$src/env'
  import { instance } from './store'

  let code = ''
  $: {
    const url = `${PUBLIC_APP_PROTOCOL}://${$instance.subdomain}.${PUBLIC_APP_DOMAIN}`
    code = `const url = '${url}'\nconst client = new PocketBase(url)`
  }
</script>

<AccordionItem title="Code Samples">
  JavaScript:
  <CodeSample {code} />
</AccordionItem>
