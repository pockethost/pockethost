<script lang="ts">
  import AlertBar from '$components/AlertBar.svelte'
  import { client } from '$src/pocketbase'
  import { createCleanupManagerSync } from '$util/CleanupManager'
  import { BackupStatus, type BackupRecord, type RecordId } from '@pockethost/common'
  import { reduce, sortBy } from '@s-libs/micro-dash'
  import { formatDistanceToNow } from 'date-fns'
  import prettyBytes from 'pretty-bytes'
  import { onDestroy, onMount } from 'svelte'
  import { instance } from '../store'

  const cm = createCleanupManagerSync()
  let backups: BackupRecord[] = []
  let isBackingUp = false
  onMount(async () => {
    const { watchBackupsByInstanceId } = client()
    watchBackupsByInstanceId($instance.id, (r) => {
      console.log(`Handling backup update`, r)
      const { action, record } = r
      const _backups = reduce(
        backups,
        (c, b) => {
          c[b.id] = b
          return c
        },
        {} as { [_: RecordId]: BackupRecord }
      )
      _backups[record.id] = record

      isBackingUp = false
      backups = sortBy(_backups, (e) => {
        isBackingUp ||=
          e.status !== BackupStatus.FinishedError && e.status !== BackupStatus.FinishedSuccess
        return Date.parse(e.created)
      }).reverse()
      console.log(record.id)
    }).then(cm.add)
  })
  onDestroy(cm.cleanupAll)

  const startBackup = () => {
    const { createInstanceBackupJob } = client()
    createInstanceBackupJob($instance.id)
  }
</script>

<svelte:head>
  <title>Backups - PocketHost</title>
</svelte:head>

<div class="text-center py-5">
  <button class="btn btn-light" on:click={() => startBackup()} disabled={isBackingUp}>
    <i class="bi bi-safe" /> Backup Now
  </button>
</div>

<div>
  {#each backups as { bytes, updated, platform, version, status, message, progress }}
    <div>
      {#if status === BackupStatus.FinishedSuccess}
        <div class="text-success">
          {platform}:{version} ({prettyBytes(bytes)}) - Finished {new Date(updated)}
        </div>
      {/if}
      {#if status === BackupStatus.FinishedError}
        <div class="text-danger">
          {platform}:{version} - Finished {new Date(updated)}
          <AlertBar icon="bi bi-exclamation-triangle-fill" text={message} />
        </div>
      {/if}
      {#if ![BackupStatus.FinishedSuccess, BackupStatus.FinishedError].find((v) => v === status)}
        <div class="text-warning">
          {platform}:{version} ({status}
          {Math.ceil(progress * 100)}%) - Started {formatDistanceToNow(Date.parse(updated))} ago
        </div>
      {/if}
    </div>
  {/each}
</div>
