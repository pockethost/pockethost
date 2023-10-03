<script lang="ts">
  import CodeSample from '$components/CodeSample.svelte'
  import Card from '$components/cards/Card.svelte'
  import CardHeader from '$components/cards/CardHeader.svelte'
  import { PUBLIC_APP_DOMAIN } from '$src/env'
  import { client } from '$src/pocketbase'
  import { bash } from 'svelte-highlight/languages'

  const { user } = client()
  const { email } = user() || {}

  // This will hide the component if the email was not found
  if (!email) {
    throw new Error(`Email expected here`)
  }
  const ftpUrl = `ftp://${encodeURIComponent(
    email,
  )}@ftp.sfo-1.${PUBLIC_APP_DOMAIN}`
</script>

<Card>
  <CardHeader
    documentation="https://pockethost.gitbook.io/manual/daily-usage/ftp"
  >
    FTP Access
  </CardHeader>

  <p class="mb-8">
    Securely access your instance files via FTPS. Use your PocketHost account
    login and password.
  </p>

  <p>Bash:</p>

  <div class="mb-12">
    <CodeSample code={`ftp ${ftpUrl}`} language={bash} />
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
        <td>The PocketBase data directory</td>
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
</Card>
