<script lang="ts">
  import { assertExists } from 'pockethost/common'
  import CodeSample from '$components/CodeSample.svelte'
  import FeatureTab from '$components/FeatureTab.svelte'
  import QuickReference from '$components/QuickReference.svelte'
  import { instance } from '../store'
  import SecretsInner from './Inner.svelte'
  import { items } from './stores'

  assertExists($instance, `Expected instance here`)
  const { subdomain } = $instance

  $: {
    const { secrets } = $instance
    items.clear()

    for (const [name, value] of Object.entries(secrets || {})) {
      items.upsert({ name, value })
    }
  }

  $: code =
    `// pb_hooks/env-test.pb.js\n\n` +
    ($items.length > 0
      ? $items
          .map(({ name, value }) => `const ${name} = process.env.${name}\nconsole.log("${name}: ", ${name})`)
          .join('\n')
      : `const YOUR_KEY = process.env.YOUR_KEY`)
</script>

<svelte:head>
  <title>{subdomain} secrets - PocketHost</title>
</svelte:head>

<FeatureTab title="Secrets" documentation="/docs/secrets">
  <svelte:fragment slot="summary">
    <p>
      These secrets are forwarded to your <code>pocketbase</code> process as environment variables. They are also
      accessible from any <code>pb_hooks</code> you have created.
    </p>
  </svelte:fragment>

  <svelte:fragment slot="cta">
    {#if $items.length === 0}
      <wa-callout variant="brand" class="wa-callout-padded wa-callout-brand-accent">
        <wa-icon slot="icon" name="user-secret"></wa-icon>
        <span>No secrets yet. Create your first secret to get started.</span>
      </wa-callout>
    {/if}
  </svelte:fragment>

  <SecretsInner />

  <svelte:fragment slot="reference">
    {#if $items.length > 0}
      <QuickReference>
        <CodeSample {code} className="" embedded />
      </QuickReference>
    {/if}
  </svelte:fragment>
</FeatureTab>
