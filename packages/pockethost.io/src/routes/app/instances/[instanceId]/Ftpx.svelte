<script lang="ts">
  import { PUBLIC_APP_DOMAIN } from '$src/env'
  import { client } from '$src/pocketbase'
  import type { InstanceFields } from '@pockethost/common'

  export let instance: InstanceFields

  const { user } = client()
  const { subdomain } = instance
  const { email } = user() || {}
  if (!email) {
    throw new Error(`Email expected here`)
  }
  const ftpUrl = `ftp://${encodeURI(email)}@${PUBLIC_APP_DOMAIN}`
</script>

<div class="py-4">
  <h2>FTP Access</h2>
  <div>
    Securely access your instance files via <a href={ftpUrl}>{ftpUrl}</a>. Use your PocketHost
    account login and password.
    <table>
      <thead><tr><th>Directory</th><th>Description</th></tr></thead>
      <tr>
        <th>pb_data</th><td>The PocketBase data directory</td>
      </tr>
      <tr>
        <th>pb_static</th><td>Static files, such as a web frontend</td>
      </tr>
      <tr>
        <th>backups</th><td>Location of tgz backups made using this UI</td>
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
