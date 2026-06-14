<script lang="ts">
  import CodeSample from '$components/CodeSample.svelte'
  import CardHeader from '$components/cards/CardHeader.svelte'
  import { FTP_HOST, SFTP_COMMAND, SFTP_PORT } from '$src/env'
  import { client } from '$src/pocketbase-client'
  import { instance } from '../store'
  import { bash } from 'svelte-highlight/languages'

  const { user } = client()
  const { email } = user() || {}

  if (!email) {
    throw new Error(`Email expected here`)
  }

  const sftpCommand = SFTP_COMMAND(email)
</script>

<div class="max-w-2xl">
  <CardHeader documentation={`/docs/ftp`}>SFTP File Access</CardHeader>
  <div class="mb-8 space-y-4">
    <p>
      Access instance files via <strong>SFTP</strong> at <code>{FTP_HOST}:{SFTP_PORT}</code>. Authentication is an
      <strong>Ed25519 SSH key</strong> registered under <a href="/account/keys" class="text-primary">Account → Keys</a>.
      Your username is your PocketHost email.
    </p>
    <p class="text-white/70 text-sm">
      After connecting, <code>cd {$instance.subdomain}</code> to reach this instance. See
      <a href="/docs/ftp" class="text-primary">SFTP File Access</a> for macOS, Windows, Linux, and client setup.
    </p>
  </div>

  <div class="mb-12">
    <CodeSample code={sftpCommand} language={bash} />
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
