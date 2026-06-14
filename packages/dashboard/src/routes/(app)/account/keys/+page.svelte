<script lang="ts">
  import CardHeader from '$components/cards/CardHeader.svelte'
  import SshKeysPanel from '../SshKeysPanel.svelte'
</script>

<svelte:head>
  <title>SSH Keys - PocketHost</title>
</svelte:head>

<CardHeader documentation="/docs/ftp">SFTP SSH Keys</CardHeader>
<SshKeysPanel />
