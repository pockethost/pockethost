<script lang="ts">
  import { PUBLIC_APP_DOMAIN } from '$env/static/public'
  import { client } from '$src/pocketbase'
  import { createCleanupManagerSync } from '$util/CleanupManager'
  import {
    BackupStatus,
    type BackupRecord,
    type InstancesRecord,
    type RecordId
  } from '@pockethost/common'
  import { reduce, sortBy } from '@s-libs/micro-dash'
  import prettyBytes from 'pretty-bytes'
  import { onDestroy, onMount } from 'svelte'
  import { writable } from 'svelte/store'

  export let instance: InstancesRecord

  const cm = createCleanupManagerSync()
  const backups = writable<BackupRecord[]>([])
  let isBackingUp = false
  onMount(async () => {
    const { watchBackupsByInstanceId } = client()
    watchBackupsByInstanceId(instance.id, (r) => {
      // console.log(`Handling backup update`, r)
      const { action, record } = r
      const _backups = reduce(
        $backups,
        (c, b) => {
          c[b.id] = b
          return c
        },
        {} as { [_: RecordId]: BackupRecord }
      )
      _backups[record.id] = record

      isBackingUp = false
      backups.set(
        sortBy(_backups, (e) => {
          isBackingUp ||=
            e.status !== BackupStatus.FinishedError && e.status !== BackupStatus.FinishedSuccess
          return Date.parse(e.created)
        }).reverse()
      )
      // console.log(record.id)
    }).then(cm.add)
  })
  onDestroy(cm.cleanupAll)

  const startRestore = () => {
    const { createInstanceBackupJob } = client()
    createInstanceBackupJob(instance.id)
  }

  let sourceBackupId = ''
</script>

<div class="py-4">
  <h2>Restore</h2>

  {#if PUBLIC_APP_DOMAIN.toString().endsWith('.io')}
    Contact support to perform a restore.
  {/if}
  {#if PUBLIC_APP_DOMAIN.toString().endsWith('.test')}
    {#if $backups.length === 0}
      You must create a backup first.
    {/if}
    {#if $backups.length > 0}
      <select value={sourceBackupId}>
        <option value=""> -- choose snapshot -- </option>
        {#each $backups as { id, bytes, updated, platform, version, status, message, progress }}
          {#if status === BackupStatus.FinishedSuccess}
            <option value={id}>
              {platform}:{version} ({prettyBytes(bytes)}) - Finished {new Date(updated)}#
            </option>
          {/if}
        {/each}
      </select>

      <div class="text-center py-5">
        <div class="text-danger">
          Notice: Your instance will be placed in maintenance mode and then backed up before
          restoring the selected snapshot.
        </div>
        <button class="btn btn-light" on:click={() => startRestore()} disabled={!sourceBackupId}>
          <i class="bi bi-safe" /> Restore Now
        </button>
      </div>
    {/if}
  {/if}
</div>

<style lang="scss">
  select {
    max-width: 100%;
  }
</style>
