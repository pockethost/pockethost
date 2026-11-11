<script lang="ts">
  import FeatureTab from '$components/FeatureTab.svelte'
  import {
    BACKUP_INTERVALS,
    BACKUP_WEBHOOK_ENDPOINT,
    DEFAULT_BACKUP_INTERVAL,
    backupCron,
    backupIntervalForCron,
    isBackupWebhook,
    type BackupIntervalId,
  } from '$lib/backupWebhook'
  import { client } from '$src/pocketbase-client'
  import { instance } from '../store'
  import Toggle from '../Toggle.svelte'

  const id = $derived($instance.id)
  const subdomain = $derived($instance.subdomain)
  const webhooks = $derived($instance.webhooks ?? [])
  const backup = $derived(webhooks.find((w) => isBackupWebhook(w.endpoint)))
  const savedInterval = $derived(backup ? (backupIntervalForCron(id, backup.value) ?? 'custom') : undefined)

  let pickedInterval = $state<BackupIntervalId>(DEFAULT_BACKUP_INTERVAL)
  const shownInterval = $derived(savedInterval ?? pickedInterval)

  let saving = $state(false)
  let errorMessage = $state('')

  const lastRun = $derived.by(() => {
    const fired = backup?.lastFired
    if (!fired) return undefined
    const { status, body } = fired.response
    let detail = body
    try {
      const parsed = JSON.parse(body)
      detail = parsed.name ?? parsed.error ?? body
    } catch {}
    return { ok: status >= 200 && status < 300, status, detail, when: new Date(fired.timestamp).toLocaleString() }
  })

  const save = async (enabled: boolean, interval: BackupIntervalId) => {
    saving = true
    errorMessage = ''
    const others = webhooks.filter((w) => !isBackupWebhook(w.endpoint))
    const next = enabled
      ? [
          ...others,
          { endpoint: BACKUP_WEBHOOK_ENDPOINT, value: backupCron(id, interval), lastFired: backup?.lastFired },
        ]
      : others
    try {
      await client().updateInstance({ id, fields: { webhooks: next } })
    } catch (error: any) {
      errorMessage = error?.data?.message || error?.message || `Couldn't save your backup schedule.`
    } finally {
      saving = false
    }
  }

  const handleToggle = (enabled: boolean) => {
    save(enabled, shownInterval === 'custom' ? DEFAULT_BACKUP_INTERVAL : shownInterval)
  }

  const handleInterval = (e: Event) => {
    const value = (e.target as HTMLSelectElement).value
    if (value === 'custom' || !BACKUP_INTERVALS.some((i) => i.id === value)) return
    pickedInterval = value as BackupIntervalId
    if (backup) save(true, pickedInterval)
  }
</script>

<svelte:head>
  <title>{subdomain} backups - PocketHost</title>
</svelte:head>

<FeatureTab title="Backups" documentation="/docs/backup-restore" bind:errorMessage>
  <svelte:fragment slot="summary">
    <p>
      Back up your database on a schedule. Backups run on time even while your instance is hibernating. They use your
      settings in the PocketBase admin under <strong>Settings &gt; Backups</strong>: where backups are stored, and
      <strong>Max @auto backups</strong> for how many to keep. For the best protection, store them in your own S3 bucket with
      versioning turned on.
    </p>
  </svelte:fragment>

  <wa-card class="border border-white/10 bg-[#111111]/80 shadow-lg overflow-hidden">
    <div class="wa-card-body wa-card-body--lg flex flex-col gap-5">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <h3 class="text-lg font-semibold">Scheduled backups</h3>
        <Toggle checked={!!backup} onChange={handleToggle} disabled={saving} offClass="text-white/55" />
      </div>

      <div class="flex flex-col gap-2 max-w-xs">
        <wa-select label="How often" value={shownInterval} oninput={handleInterval} disabled={saving}>
          {#each BACKUP_INTERVALS as interval}
            <wa-option value={interval.id}>{interval.label}</wa-option>
          {/each}
          {#if shownInterval === 'custom'}
            <wa-option value="custom" disabled>Custom: {backup?.value}</wa-option>
          {/if}
        </wa-select>
        <span class="text-xs text-white/55">Each instance gets its own time of day, so backups are spread out.</span>
      </div>

      {#if backup}
        <div class="text-sm">
          {#if lastRun}
            <span class={lastRun.ok ? 'text-success' : 'text-error'}>
              {lastRun.ok ? 'Last backup' : 'Last backup failed'}
            </span>
            <span class="text-white/70">· {lastRun.when}</span>
            {#if lastRun.detail}
              <div class="mt-1 font-mono text-xs text-white/55 break-all">{lastRun.detail}</div>
            {/if}
            {#if lastRun.status === 401}
              <div class="mt-1 text-white/70">Power your instance off and on once so it picks up its backup token.</div>
            {/if}
          {:else}
            <span class="text-white/55">No backups yet. The first one runs at the next scheduled time.</span>
          {/if}
        </div>
      {/if}
    </div>
  </wa-card>
</FeatureTab>
