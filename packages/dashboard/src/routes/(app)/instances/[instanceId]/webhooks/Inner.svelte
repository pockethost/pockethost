<script lang="ts">
  import CodeSample from '$components/CodeSample.svelte'
  import { instance } from '../store'
  import Form from './Form.svelte'
  import List from './List.svelte'
  import { items } from './stores'

  $: {
    const { id, webhooks } = $instance
    items.clear()

    ;(webhooks ?? []).forEach((hook) => {
      items.upsert(hook)
    })
  }

  $: code =
    `// pb_hooks/my-webhook.pb.js\n\n` +
    ($items.length > 0
      ? $items
          .map(
            ({ endpoint, value }) => `routerAdd("GET", "${endpoint}", (e) => {
    return e.json(200, { "message": "Webhook called" })
}))`
          )
          .join('\n')
      : ``)
</script>

<div class="mb-4">
  Webhooks let you call API endpoints on your instance at scheduled times, replacing PocketBase's standard cron
  scheduler.
</div>

{#if $items.length > 0}
  <div class="mb-8">
    <CodeSample {code} />
  </div>
{/if}

{#if $items.length === 0}
  <wa-callout variant="brand" class="border-2 border-primary mb-8">
    <wa-icon slot="icon" name="user-secret"></wa-icon>
    <span>No webhooks yet. Create your first webhook to get started.</span>
  </wa-callout>
{:else}
  <List />
{/if}
<Form />
