---
title: Webhooks
description: Learn how to use Pockethost webhooks to schedule reliable API calls without external cron jobs. Automate tasks like backups, data cleanup, notifications, and integrations—even when your instance is hibernated
---

# Webhooks

Webhooks allow you to schedule API calls to your PocketBase instance at specific times, replacing the need for external cron job schedulers. This feature enables automated tasks like data cleanup, backups, notifications, and integrations with external services.

> **Important**: Webhooks replace PocketBase's built-in [cron job scheduling](https://pocketbase.io/docs/js-jobs-scheduling/) (`cronAdd`) on PocketHost. While `cronAdd` works in standard PocketBase deployments, it becomes unreliable on PocketHost due to instance hibernation. Scheduled webhooks will always execute reliably, even when your instance is hibernated.

## Overview

Webhooks are configured through the PocketHost dashboard and automatically send HTTP GET requests to your specified endpoints at scheduled intervals. Each webhook consists of:

- **API Endpoint**: The URL path within your instance to call
- **Schedule**: A cron expression defining when the webhook executes

All webhooks execute in **UTC time**. Make sure to adjust your cron schedules accordingly.

### Why Use Webhooks Instead of `cronAdd`?

On PocketHost, webhooks provide several advantages over PocketBase's built-in `cronAdd`:

- **Reliability**: Webhooks execute even when your instance is hibernated
- **Consistency**: No dependency on your instance's uptime
- **Scalability**: Handled by PocketHost's infrastructure, not your instance
- **Monitoring**: Better visibility into execution status and failures

## Configuration

### API Endpoint

The API endpoint must be a valid path within your PocketBase instance:

- Must start with `/` (e.g., `/api/webhooks/backup`)
- Can include query parameters (e.g., `/api/cron?token=abc123`)
- Cannot include protocol or host (no `http://` or `https://`)
- Supports any valid URL path structure

**Examples:**

- `/api/webhooks/daily-cleanup`
- `/api/backup?type=full&compress=true`
- `/webhook/slack/notifications`
- `/api/maintenance/cleanup-old-records`

### Schedule (Cron Expression)

Webhooks use standard cron expressions to define execution schedules. You can use either:

#### Predefined Macros

| Macro       | Description                          | Equivalent Expression |
| ----------- | ------------------------------------ | --------------------- |
| `@yearly`   | Once a year at midnight, January 1st | `0 0 1 1 *`           |
| `@annually` | Same as `@yearly`                    | `0 0 1 1 *`           |
| `@monthly`  | Once a month at midnight, first day  | `0 0 1 * *`           |
| `@weekly`   | Once a week at midnight on Sunday    | `0 0 * * 0`           |
| `@daily`    | Once a day at midnight               | `0 0 * * *`           |
| `@midnight` | Same as `@daily`                     | `0 0 * * *`           |
| `@hourly`   | Once an hour at the beginning        | `0 * * * *`           |
| `@minutely` | Once a minute                        | `* * * * *`           |
| `@secondly` | Once a second                        | `* * * * * *`         |
| `@weekdays` | Every weekday at midnight            | `0 0 * * 1-5`         |
| `@weekends` | Every weekend at midnight            | `0 0 * * 0,6`         |

#### Standard Cron Expressions

Standard cron expressions use 5 fields: `minute hour day month weekday`

| Field        | Values | Special Characters | Description                |
| ------------ | ------ | ------------------ | -------------------------- |
| Minute       | 0-59   | `* , - / ?`        | Minute of the hour         |
| Hour         | 0-23   | `* , - / ?`        | Hour of the day            |
| Day of Month | 1-31   | `* , - / ? L W`    | Day of the month           |
| Month        | 1-12   | `* , - / ?`        | Month of the year          |
| Day of Week  | 0-6    | `* , - / ? L #`    | Day of the week (0=Sunday) |

**Special Characters:**

- `*` - Any value
- `,` - Value list separator
- `-` - Range of values
- `/` - Step values
- `?` - Any value (alias for `*`)
- `L` - Last day of month/week
- `W` - Weekday (nearest to given day)
- `#` - Nth day of month

### Timing

All webhooks execute in **UTC time**. When scheduling webhooks, convert your local time to UTC:

- **EST (UTC-5)**: 9 AM EST = 2 PM UTC (14:00)
- **PST (UTC-8)**: 6 PM PST = 2 AM UTC next day (02:00)
- **GMT+3**: 3 PM = 12 PM UTC (12:00)

Use online UTC converters to help calculate the correct schedule times.

## Common Examples

### Business Operations (UTC Time)

```cron
# Weekdays at 9 AM UTC
0 9 * * 1-5

# Every Monday at noon UTC
0 12 * * 1

# Every Friday at 6 PM UTC
0 18 * * 5

# First day of every month at midnight UTC
0 0 1 * *

# 15th of every month at 8 AM UTC
0 8 15 * *
```

### Data Management (UTC Time)

```cron
# Daily backup at 2 AM UTC
0 2 * * *

# Cleanup old records every 6 hours
0 */6 * * *

# Weekly data export on Sundays at midnight UTC
0 0 * * 0

# Monthly maintenance on the 1st at midnight UTC
0 0 1 * *
```

### Using Macros

```cron
# Daily operations
@daily

# Weekly reports
@weekly

# Monthly cleanup
@monthly

# Business hours only
@weekdays
```

## Implementation

### Creating Webhook Endpoints

Create API endpoints in your PocketBase instance to handle webhook requests using [PocketBase's routing system](https://pocketbase.io/docs/js-routing/):

```javascript
// pb_hooks/onRequest.pb.js
routerAdd('GET', '/api/webhooks/backup', (e) => {
  // Your backup logic here
  console.log('Backup webhook triggered')

  // Example: Create a backup record
  const backup = new Record($app.findCollectionByNameOrId('backups'), {
    timestamp: new Date().toISOString(),
    status: 'completed',
    size: '1.2GB',
  })

  $app.save(backup)

  return e.json(200, { status: 'success' })
})
```

### Error Handling

Webhooks should return appropriate HTTP status codes:

- `200` - Success
- `400` - Bad request
- `500` - Internal server error

```javascript
routerAdd('GET', '/api/webhooks/cleanup', (e) => {
  try {
    // Your cleanup logic
    return e.json(200, { status: 'success' })
  } catch (error) {
    console.error('Webhook error:', error)
    return e.json(500, { error: 'Internal server error' })
  }
})
```

### Authentication

For secure webhooks, include authentication in your endpoints:

```javascript
routerAdd('GET', '/api/webhooks/secure', (e) => {
  const token = e.request.url.query().get('token')

  if (token !== process.env.WEBHOOK_SECRET) {
    return e.json(401, { error: 'Unauthorized' })
  }

  // Your secure webhook logic
  return e.json(200, { status: 'success' })
})
```

## Best Practices

### 1. Idempotency

Make your webhooks idempotent so they can be safely retried:

```javascript
routerAdd('GET', '/api/webhooks/process', (e) => {
  const jobId = e.request.url.query().get('jobId')

  // Check if already processed
  const existing = $app.findFirstRecordByData('jobs', 'jobId', jobId)
  if (existing && existing.get('status') === 'completed') {
    return e.json(200, { status: 'already_processed' })
  }

  // Process the job
  // ...
})
```

### 2. Logging

Always log webhook executions for debugging:

```javascript
routerAdd('GET', '/api/webhooks/backup', (e) => {
  console.log(`Backup webhook triggered at ${new Date().toISOString()}`)

  // Your backup logic

  console.log('Backup webhook completed successfully')
  return e.json(200, { status: 'success' })
})
```

## Troubleshooting

### Common Issues

1. **Webhook not executing**: Check the cron expression syntax and ensure times are in UTC
2. **Endpoint not found**: Ensure the API endpoint exists in your PocketBase instance using [PocketBase routing](https://pocketbase.io/docs/js-routing/)
3. **Authentication errors**: Verify any required tokens or secrets
4. **Timeout errors**: Optimize webhook execution time
5. **Using `cronAdd` instead of webhooks**: Replace `cronAdd` calls with scheduled webhooks for reliable execution on PocketHost
6. **Wrong execution time**: Remember all schedules are in UTC - convert your local time accordingly

## Limitations

- Concurrent webhook executions may be limited
- Webhooks may not run exactly at the time specified, depending on system load and instance state
- Webhooks are triggered by PocketHost's scheduling system, not your instance's internal clock
