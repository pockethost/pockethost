<script lang="ts">
  import CodeSample from '$components/CodeSample.svelte'
  import { forEach } from '@s-libs/micro-dash'
  import { instance } from '../store'
  import Form from './Form.svelte'
  import List from './List.svelte'
  import { items } from './stores'

  $: {
    const { id, secrets } = $instance
    items.clear()

    forEach(secrets || {}, (value, name) => {
      items.upsert({ name, value })
    })
  }

  $: code =
    `// pb_hooks/env-test.pb.js\n\n` +
    ($items.length > 0
      ? $items
          .map(({ name, value }) => `const ${name} = process.env.${name}\nconsole.log("${name}: ", ${name})`)
          .join('\n')
      : `const YOUR_KEY = process.env.YOUR_KEY`)
</script>

<div class="mb-4">
  These secrets are forwarded to your <code>pocketbase</code> as environment variables, which are also accessible from
  any <code>pb_hooks</code> you have created.
</div>

{#if $items.length > 0}
  <div class="mb-8">
    <CodeSample {code} />
  </div>
{/if}

{#if $items.length === 0}
  <wa-callout variant="brand" class="border-2 border-primary mb-8">
    <wa-icon slot="icon" name="user-secret"></wa-icon>
    <span>No secrets yet. Create your first secret to get started.</span>
  </wa-callout>
{:else}
  <List />
{/if}
<Form />
