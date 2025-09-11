<script lang="ts">
  import AlertBar from '$components/AlertBar.svelte'
  import { client } from '$src/pocketbase-client/index.js'
  import { reduce } from '@s-libs/micro-dash'
  import { type UpdateInstancePayload } from 'pockethost/common'
  import { instance } from '../store.js'
  import { items } from './stores.js'
  import { faFloppyDisk } from '@fortawesome/free-solid-svg-icons'
  import Fa from 'svelte-fa'

  // Validate webhook endpoint path (must start with /, can include query params, no host/protocol)
  const validateWebhookEndpoint = (endpoint: string): boolean => {
    if (!endpoint || endpoint.length === 0) return false

    // Must start with /
    if (!endpoint.startsWith('/')) return false

    // Check if it contains protocol or host (should not)
    if (endpoint.includes('://') || endpoint.includes('://')) return false
    if (endpoint.includes('http://') || endpoint.includes('https://')) return false

    // Basic path validation - should be a valid URL path
    try {
      // Create a fake URL to validate the path part
      const testUrl = new URL(`http://example.com${endpoint}`)
      const path = testUrl.pathname

      // Path should be at least 2 characters (including the leading /)
      if (path.length < 2) return false

      // Should not contain invalid characters for URL paths
      if (path.includes('//') || path.includes('\\')) return false

      return true
    } catch {
      return false
    }
  }

  // Basic cron expression validation
  const validateCronExpression = (cronExpression: string): boolean => {
    if (!cronExpression || cronExpression.length === 0) return false

    const expression = cronExpression.trim()

    // Check for predefined macros first
    const validMacros = [
      '@yearly',
      '@annually',
      '@monthly',
      '@weekly',
      '@daily',
      '@midnight',
      '@hourly',
      '@minutely',
      '@secondly',
      '@weekdays',
      '@weekends',
    ]

    if (validMacros.includes(expression)) {
      return true
    }

    // Basic validation: should have 5 parts separated by spaces
    const parts = expression.split(/\s+/)
    if (parts.length !== 5) return false

    // Each part should contain valid cron characters
    const validChars = /^[\d*,\-/?LW#]+$/
    return parts.every((part) => validChars.test(part))
  }

  // Keep track of the new key and value to be added
  let apiEndpoint: string = ''
  let cronValue: string = ''

  // These will validate the key and value before being submitted
  let isApiEndpointValid = false
  let isCronValueValid = false
  let isFormValid = false

  // This will animate a success message when the key is saved
  let successfulSave = false

  // Keep track of any error message
  let errorMessage: string = ''

  // Watch for changes in real time and update the key and value as the user types them
  $: {
    apiEndpoint = apiEndpoint.trim()
    isApiEndpointValid = validateWebhookEndpoint(apiEndpoint)
    isCronValueValid = cronValue.length > 0 && validateCronExpression(cronValue)
    isFormValid = isApiEndpointValid && isCronValueValid
  }

  // Submit the form to create the new environment variable
  const handleSubmit = async (e: Event) => {
    e.preventDefault()

    // Reset any messaging
    errorMessage = ''

    try {
      // Block the button from submitting more than once
      isFormValid = false

      // Save to the database
      items.upsert({ endpoint: apiEndpoint, value: cronValue.trim() })
      await client().updateInstance({
        id: $instance.id,
        fields: {
          webhooks: $items,
        },
      })

      // Reset the values when the POST is done
      apiEndpoint = ''
      cronValue = ''

      // Enable the submit button
      isFormValid = true

      // Show the success message
      successfulSave = true

      // Remove the success toast after a few seconds
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

  <form on:submit={handleSubmit} class="mb-4">
    <div class="flex flex-row gap-1 mb-4">
      <label class="flex-1 form-control w-2/5">
        <input
          id="webhook-api-endpoint"
          type="text"
          bind:value={apiEndpoint}
          placeholder="/api/webhooks/my-endpoint"
          class={`input input-bordered ${!isApiEndpointValid && apiEndpoint.length > 0 ? 'input-error text-error' : ''}`}
        />
        {#if !isApiEndpointValid && apiEndpoint.length > 0}
          <div class="label">
            <span class="text-error">
              API endpoints must be valid paths starting with / (e.g., <code>/api/webhooks/my-webhook</code> or
              <code>/api/cron?token=abc</code>). Do not include protocol or host.
            </span>
          </div>
        {/if}
      </label>
      <div class="flex-1 form-control w-2/5">
        <input
          id="webhook-schedule"
          type="text"
          bind:value={cronValue}
          placeholder="Schedule (UTC time)"
          class={`input input-bordered ${!isCronValueValid && cronValue.length > 0 ? 'input-error text-error' : ''}`}
        />
        {#if !isCronValueValid && cronValue.length > 0}
          <div class="label">
            <span class="text-error">
              Please enter a valid cron expression (e.g., <code>0 9 * * 1-5</code> for weekdays at 9 AM UTC, or
              <code>@daily</code> for daily at midnight UTC).
            </span>
          </div>
        {/if}
      </div>

      <div class="flex-none text-right w-1/5 md:w-auto">
        <button type="submit" class="btn btn-primary px-2.5 md:px-3" disabled={!isFormValid}>
          Add <Fa icon={faFloppyDisk} />
        </button>
      </div>
    </div>

    <div class="mb-4">
      <p>
        The schedule is a cron expression that defines when the webhook will be called in <strong>UTC time</strong>. For
        example,
        <code>0 0 * * *</code> means every day at midnight UTC.
      </p>
      <table class="table table-sm w-full mt-4">
        <thead>
          <tr>
            <th>Field</th>
            <th>Allowed Values</th>
            <th>Special Characters</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>Minute</code></td>
            <td>0-59</td>
            <td><code>,</code> <code>-</code> <code>*</code> <code>/</code></td>
          </tr>
          <tr>
            <td><code>Hour</code></td>
            <td>0-23</td>
            <td><code>,</code> <code>-</code> <code>*</code> <code>/</code></td>
          </tr>
          <tr>
            <td><code>Day of Month</code></td>
            <td>1-31</td>
            <td
              ><code>,</code> <code>-</code> <code>*</code> <code>/</code> <code>?</code> <code>L</code>
              <code>W</code></td
            >
          </tr>
          <tr>
            <td><code>Month</code></td>
            <td>1-12 or JAN-DEC</td>
            <td><code>,</code> <code>-</code> <code>*</code> <code>/</code></td>
          </tr>
          <tr>
            <td><code>Day of Week</code></td>
            <td>0-6 or SUN-SAT</td>
            <td
              ><code>,</code> <code>-</code> <code>*</code> <code>/</code> <code>?</code> <code>L</code>
              <code>#</code></td
            >
          </tr>
        </tbody>
      </table>
      <div class="mt-2">
        <strong>Common Macros:</strong>
        <ul class="list-disc pl-6">
          <li><code>@yearly</code>: <code>0 0 1 1 *</code> (once a year at midnight, Jan 1)</li>
          <li><code>@annually</code>: <code>0 0 1 1 *</code> (same as <code>@yearly</code>)</li>
          <li><code>@monthly</code>: <code>0 0 1 * *</code> (once a month at midnight, first day)</li>
          <li><code>@weekly</code>: <code>0 0 * * 0</code> (once a week at midnight, Sunday)</li>
          <li><code>@daily</code>: <code>0 0 * * *</code> (once a day at midnight)</li>
          <li><code>@midnight</code>: <code>0 0 * * *</code> (same as <code>@daily</code>)</li>
          <li><code>@hourly</code>: <code>0 * * * *</code> (once an hour at minute 0)</li>
        </ul>
      </div>

      <div class="mt-4">
        <strong>Practical Examples:</strong>
        <ul class="list-disc pl-6">
          <li><code>0 9 * * 1-5</code> - Every weekday at 9:00 AM</li>
          <li><code>0 12 * * 1</code> - Every Monday at noon</li>
          <li><code>0 0 1 * *</code> - First day of every month at midnight</li>
          <li><code>0 18 * * 5</code> - Every Friday at 6:00 PM</li>
          <li><code>30 2 * * *</code> - Every day at 2:30 AM</li>
          <li><code>0 */6 * * *</code> - Every 6 hours (00:00, 06:00, 12:00, 18:00)</li>
          <li><code>0 0 * * 0</code> - Every Sunday at midnight</li>
          <li><code>0 8 15 * *</code> - 15th of every month at 8:00 AM</li>
          <li><code>0 0 1 1 *</code> - New Year's Day at midnight</li>
          <li><code>0 12 * * 0,6</code> - Weekends at noon</li>
        </ul>
      </div>
    </div>
  </form>
</div>

<style>
  :global(code) {
    background-color: #565656;
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    font-family: ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace;
    font-size: 0.875em;
  }
</style>
