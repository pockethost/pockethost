<script lang="ts">
  import AlertBar from '$components/AlertBar.svelte'
  import CronSchedulePicker from '$components/CronSchedulePicker.svelte'
  import CronScheduleReference from '$components/CronScheduleReference.svelte'
  import { validateCronExpression } from '$lib/cronExpression'
  import { client } from '$src/pocketbase-client/index.js'
  import { instance } from '../store.js'
  import { items } from './stores.js'

  const validateWebhookEndpoint = (endpoint: string): boolean => {
    if (!endpoint || endpoint.length === 0) return false
    if (!endpoint.startsWith('/')) return false
    if (endpoint.includes('://') || endpoint.includes('://')) return false
    if (endpoint.includes('http://') || endpoint.includes('https://')) return false

    try {
      const testUrl = new URL(`http://example.com${endpoint}`)
      const path = testUrl.pathname
      if (path.length < 2) return false
      if (path.includes('//') || path.includes('\\')) return false
      return true
    } catch {
      return false
    }
  }

  let apiEndpoint: string = ''
  let cronValue: string = ''
  let cronCustomMode = false

  let isApiEndpointValid = false
  let isCronValueValid = false
  let isFormValid = false

  let successfulSave = false
  let errorMessage: string = ''

  $: {
    apiEndpoint = apiEndpoint.trim()
    isApiEndpointValid = validateWebhookEndpoint(apiEndpoint)
    isCronValueValid = cronValue.length > 0 && validateCronExpression(cronValue)
    isFormValid = isApiEndpointValid && isCronValueValid
  }

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    errorMessage = ''

    try {
      isFormValid = false

      items.upsert({ endpoint: apiEndpoint, value: cronValue.trim() })
      await client().updateInstance({
        id: $instance.id,
        fields: {
          webhooks: $items,
        },
      })

      apiEndpoint = ''
      cronValue = ''
      isFormValid = true
      successfulSave = true

      setTimeout(() => {
        successfulSave = false
      }, 5000)
    } catch (error: any) {
      errorMessage = error.message
    }
  }
</script>

<h3 class="text-xl">Add New Webhook</h3>

<div class="mb-8">
  {#if successfulSave}
    <AlertBar message="Your new webhook has been saved." type="success" />
  {/if}

  <AlertBar message={errorMessage} type="error" />

  <form onsubmit={handleSubmit} class="mb-4">
    <div class="grid gap-3 md:grid-cols-[1fr_1fr_auto] items-start">
      <label class="min-w-0">
        <wa-input
          id="webhook-api-endpoint"
          type="text"
          value={apiEndpoint}
          oninput={(e: Event) => (apiEndpoint = (e.currentTarget as HTMLInputElement).value)}
          placeholder="/api/webhooks/my-endpoint"
          class={!isApiEndpointValid && apiEndpoint.length > 0 ? 'wa-input-error' : ''}
        ></wa-input>
        {#if !isApiEndpointValid && apiEndpoint.length > 0}
          <div class="mt-1">
            <span class="text-error text-sm">
              API endpoints must be valid paths starting with / (e.g., <code>/api/webhooks/my-webhook</code> or
              <code>/api/cron?token=abc</code>). Do not include protocol or host.
            </span>
          </div>
        {/if}
      </label>

      <div class="min-w-0">
        <CronSchedulePicker id="webhook-schedule" bind:value={cronValue} bind:customMode={cronCustomMode} />
      </div>

      <div class="text-right md:text-left">
        <wa-button type="submit" variant="brand" class="px-2.5 md:px-3" disabled={!isFormValid}>
          Add
          <wa-icon slot="end" name="floppy-disk"></wa-icon>
        </wa-button>
      </div>

      {#if cronCustomMode}
        <div class="md:col-span-3 flex flex-col gap-3">
          <wa-input
            id="webhook-schedule-custom"
            type="text"
            value={cronValue}
            oninput={(e: Event) => (cronValue = (e.currentTarget as HTMLInputElement).value)}
            placeholder="0 9 * * 1-5"
            class={!isCronValueValid && cronValue.length > 0 ? 'wa-input-error' : ''}
          ></wa-input>
          {#if !isCronValueValid && cronValue.length > 0}
            <span class="text-error text-sm">
              Please enter a valid cron expression (e.g., <code>0 9 * * 1-5</code> for weekdays at 9 AM UTC, or
              <code>@daily</code> for daily at midnight UTC).
            </span>
          {/if}
          <CronScheduleReference />
        </div>
      {/if}
    </div>
  </form>
</div>

