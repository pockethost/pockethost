<script lang="ts">
  import CodeSample from '$components/CodeSample.svelte'
  import CardHeader from '$components/cards/CardHeader.svelte'
  import { FTP_HOST, LFTP_COMMAND } from '$src/env'
  import { client } from '$src/pocketbase-client'
  import { bash } from 'svelte-highlight/languages'

  const { user } = client()
  const { email } = user() || {}

  // This will hide the component if the email was not found
  if (!email) {
    throw new Error(`Email expected here`)
  }
  const lftpCommand = LFTP_COMMAND(email)
</script>

<div class="max-w-2xl">
  <CardHeader documentation={`/docs/ftp`}>FTP Access</CardHeader>
  <div class="mb-8">
    Access instance files via explicit FTPS (AUTH TLS) at <code>{FTP_HOST}</code>. Log in with your PocketHost email
    and password. The macOS <code>ftp</code> client does not support TLS — use <code>lftp</code> or FileZilla (see
    docs).
  </div>

  <div class="mb-12">
    <CodeSample code={lftpCommand} language={bash} />
  </div>

  <table class="table">
    <thead>
      <tr>
        <th class="border-b-2 border-neutral">Directory</th>
        <th class="border-b-2 border-neutral">Description</th>
      </tr>
    </thead>

    <tbody>
      <tr>
        <th>pb_data</th>
        <td>The PocketBase data directory, including upload storage and database backups</td>
      </tr>
      <tr>
        <th>pb_public</th>
        <td>Public files, such as a web frontend</td>
      </tr>
      <tr>
        <th>pb_migrations</th>
        <td>The PocketBase migrations directory</td>
      </tr>
      <tr>
        <th>pb_hooks</th>
        <td>The PocketBase JS hooks directory</td>
      </tr>
    </tbody>
  </table>
</div>
