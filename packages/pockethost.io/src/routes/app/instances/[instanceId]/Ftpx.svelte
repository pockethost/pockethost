<script lang="ts">
  import CodeSample from '$components/CodeSample.svelte'
  import { PUBLIC_APP_DOMAIN } from '$src/env'
  import { client } from '$src/pocketbase'
  import { bash } from 'svelte-highlight/languages'
  import AccordionItem from '../../../../components/AccordionItem.svelte'
  import { instance } from './store'

  const { user } = client()
  $: ({ subdomain } = $instance)
  const { email } = user() || {}
  if (!email) {
    throw new Error(`Email expected here`)
  }
  const ftpUrl = `ftp://${encodeURIComponent(email)}@${PUBLIC_APP_DOMAIN}`
</script>

<AccordionItem title="FTP Access">
  <p>
    Securely access your instance files via FTPS. Use your PocketHost account login and password.
  </p>
  <p>
    <a href="https://pockethost.gitbook.io/manual/daily-usage/ftp">Full documentation</a>
  </p>
  <p>Bash:</p>
  <CodeSample code={`ftp ${ftpUrl}`} language={bash} />
  <table>
    <thead><tr><th>Directory</th><th>Description</th></tr></thead>
    <tr>
      <th>pb_data</th><td>The PocketBase data directory</td>
    </tr>
    <tr>
      <th>pb_public</th><td>Public files, such as a web frontend</td>
    </tr>
    <tr>
      <th>pb_migrations</th><td>The PocketBase migrations directory</td>
    </tr>
    <tr>
      <th>pb_hooks</th><td>The PocketBase JS hooks directory</td>
    </tr>
    <tr>
      <th>worker</th><td>Deno worker (cloud TS/JS functions)</td>
    </tr>
  </table>
</AccordionItem>

<style lang="scss">
  table {
    margin: 10px;
    td,
    tr,
    th {
      border: 2px solid rgb(92, 92, 157);
      padding: 5px;
    }
  }
</style>
