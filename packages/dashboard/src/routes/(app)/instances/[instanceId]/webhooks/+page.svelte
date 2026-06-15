<script lang="ts">
  import { assertExists } from 'pockethost/common'
  import CodeSample from '$components/CodeSample.svelte'
  import FeatureTab from '$components/FeatureTab.svelte'
  import QuickReference from '$components/QuickReference.svelte'
  import { instance } from '../store'
  import WebhooksInner from './Inner.svelte'
  import { items } from './stores'

  assertExists($instance, `Expected instance here`)
  const { subdomain } = $instance

  $: {
    const { webhooks } = $instance
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

<svelte:head>
  <title>{subdomain} webhooks - PocketHost</title>
</svelte:head>

<FeatureTab title="Webhooks" documentation="/docs/webhooks/">
  <svelte:fragment slot="summary">
    <p>
      Webhooks call API endpoints on your instance at scheduled times, replacing PocketBase's standard cron scheduler.
    </p>
  </svelte:fragment>

  <svelte:fragment slot="cta">
    {#if $items.length === 0}
      <wa-callout variant="brand" class="wa-callout-padded wa-callout-brand-accent">
        <wa-icon slot="icon" name="user-secret"></wa-icon>
        <span>No webhooks yet. Create your first webhook to get started.</span>
      </wa-callout>
    {/if}
  </svelte:fragment>

  <WebhooksInner />

  <svelte:fragment slot="reference">
    {#if $items.length > 0}
      <QuickReference>
        <CodeSample {code} className="" embedded />
      </QuickReference>
    {/if}
  </svelte:fragment>
</FeatureTab>
