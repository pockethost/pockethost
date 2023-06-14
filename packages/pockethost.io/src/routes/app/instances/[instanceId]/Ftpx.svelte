<script lang="ts">
  import CodeSample from '$components/CodeSample.svelte'
  import { PUBLIC_APP_DOMAIN } from '$src/env'
  import { client } from '$src/pocketbase'
  import type { InstanceFields } from '@pockethost/common'
  import { bash } from 'svelte-highlight/languages'

  export let instance: InstanceFields

  const { user } = client()
  const { subdomain } = instance
  const { email } = user() || {}
  if (!email) {
    throw new Error(`Email expected here`)
  }
  const ftpUrl = `ftp://${encodeURIComponent(email)}@${PUBLIC_APP_DOMAIN}`
</script>

<div class="py-4">
  <h2>FTP Access</h2>
  <div>
    Securely access your instance files via <code><a href={ftpUrl}>{ftpUrl}</a></code>. Use your
    PocketHost account login and password.
    <p>Recommended FTP client: <a href="https://filezilla-project.org/">FileZilla</a></p>
    <p>Bash:</p>
    <CodeSample code={`ftp ${ftpUrl}`} language={bash} />
    <table>
      <thead><tr><th>Directory</th><th>Description</th></tr></thead>
      <tr>
        <th>pb_data</th><td>The PocketBase data directory</td>
      </tr>
      <tr>
        <th>pb_static</th><td>Static files, such as a web frontend</td>
      </tr>
      <tr>
        <th>pb_migrations</th><td>The PocketBase migrations directory</td>
      </tr>
      <tr>
        <th>worker</th><td>Deno worker (cloud TS/JS functions)</td>
      </tr>
    </table>
  </div>
</div>

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
