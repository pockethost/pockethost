<script lang="ts">
  import { client } from '$src/pocketbase'
  import { createCleanupManagerSync } from '$util/CleanupManager'
  import { BackupStatus, type BackupRecord, type RecordId } from '@pockethost/common'
  import { reduce, sortBy } from '@s-libs/micro-dash'
  import { formatDistanceToNow } from 'date-fns'
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
  {#each backups as { id, status, updated }}
    <div>
      {id}.tgz ({formatDistanceToNow(Date.parse(updated))} ago)
    </div>
  {/each}
</div>
