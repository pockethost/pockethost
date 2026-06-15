<script lang="ts">
  import QuickReference from '$components/QuickReference.svelte'
</script>

<QuickReference>
  <p class="mb-3">
    The schedule is a cron expression that defines when the webhook will be called in <strong>UTC time</strong>. For
    example, <code>0 0 * * *</code> means every day at midnight UTC.
  </p>
  <table class="table table-sm w-full">
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
        <td><code>,</code> <code>-</code> <code>*</code> <code>/</code> <code>?</code> <code>L</code> <code>W</code></td>
      </tr>
      <tr>
        <td><code>Month</code></td>
        <td>1-12 or JAN-DEC</td>
        <td><code>,</code> <code>-</code> <code>*</code> <code>/</code></td>
      </tr>
      <tr>
        <td><code>Day of Week</code></td>
        <td>0-6 or SUN-SAT</td>
        <td><code>,</code> <code>-</code> <code>*</code> <code>/</code> <code>?</code> <code>L</code> <code>#</code></td>
      </tr>
    </tbody>
  </table>
  <div class="mt-3">
    <strong>Common Macros:</strong>
    <ul class="list-disc pl-6 mt-1">
      <li><code>@yearly</code>: <code>0 0 1 1 *</code> (once a year at midnight, Jan 1)</li>
      <li><code>@annually</code>: <code>0 0 1 1 *</code> (same as <code>@yearly</code>)</li>
      <li><code>@monthly</code>: <code>0 0 1 * *</code> (once a month at midnight, first day)</li>
      <li><code>@weekly</code>: <code>0 0 * * 0</code> (once a week at midnight, Sunday)</li>
      <li><code>@daily</code>: <code>0 0 * * *</code> (once a day at midnight)</li>
      <li><code>@midnight</code>: <code>0 0 * * *</code> (same as <code>@daily</code>)</li>
      <li><code>@hourly</code>: <code>0 * * * *</code> (once an hour at minute 0)</li>
    </ul>
  </div>

  <div class="mt-3">
    <strong>Practical Examples:</strong>
    <ul class="list-disc pl-6 mt-1">
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
</QuickReference>
