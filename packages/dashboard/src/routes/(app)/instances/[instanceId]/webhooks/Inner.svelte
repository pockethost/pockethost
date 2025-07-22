<script lang="ts">
  import CodeSample from '$components/CodeSample.svelte'
  import { forEach } from '@s-libs/micro-dash'
  import { instance } from '../store'
  import Form from './Form.svelte'
  import List from './List.svelte'
  import { items } from './stores'
  import Fa from 'svelte-fa'
  import { faUserSecret } from '@fortawesome/free-solid-svg-icons'

  $: {
    const { id, webhooks } = $instance
    items.clear()

    forEach(webhooks, (hook) => {
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

<!-- If the user has any secrets, render them in a code block -->
{#if $items.length > 0}
  <div class="mb-8">
    <CodeSample {code} />
  </div>
{/if}

{#if $items.length === 0}
  <div class="alert border-2 border-primary mb-8">
    <Fa icon={faUserSecret} />
    <span>No webhooks yet. Create your first webhook to get started.</span>
  </div>
{:else}
  <List />
{/if}
<Form />
