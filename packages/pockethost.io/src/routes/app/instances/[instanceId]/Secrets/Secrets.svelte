<script lang="ts">
  import CodeSample from '$components/CodeSample.svelte'
  import { client } from '$src/pocketbase'
  import type { InstanceFields, SaveSecretsPayload } from '@pockethost/common'
  import { createCleanupManager } from '@pockethost/common'
  import { forEach, reduce } from '@s-libs/micro-dash'
  import { onDestroy, onMount } from 'svelte'
  import Form from './Form.svelte'
  import List from './List.svelte'
  import { items } from './stores'
  import SvgIcons from './SvgIcons.svelte'

  export let instance: InstanceFields

  const cm = createCleanupManager()
  onMount(() => {
    items.clear()
    forEach(instance.secrets || {}, (value, name) => {
      items.create({ name, value })
    })
    const unsub = items.subscribe(async (secrets) => {
      await client().saveSecrets({
        instanceId: instance.id,
        secrets: reduce(
          secrets,
          (c, v) => {
            const { name, value } = v
            c[name] = value
            return c
          },
          {} as SaveSecretsPayload['secrets']
        )
      })
    })
    cm.add(unsub)
  })

  onDestroy(cm.shutdown)
</script>

<div class="py-4">
  <div class="secrets">
    <h2>Secrets</h2>
    <p>These secrets are passed into your Deno cloud worker as environment variables.</p>
    <CodeSample
      code={$items
        .map((secret) => `const ${secret.name} = Deno.env.get('${secret.name}')`)
        .join('\n')}
    />

    <SvgIcons />
    <Form />
    <List />
  </div>
</div>

<style lang="scss">
  .secrets {
    box-sizing: border-box;
    padding: 0;
    margin: 0;
  }
  .secrets {
    color: hsl(240, 25%, 95%);

    h2 {
      position: relative;
      padding: 0.25rem;
      span {
        position: absolute;
        top: 0%;
        right: 100%;
        transform: translateY(-50%);
        display: block;
        width: 1.25em;
        height: 1.25em;
        border-radius: 0.75rem;
        background: hsla(240, 25%, 50%, 0.3);
      }
      span,
      span svg {
        display: block;
        width: 100%;
        height: 100%;
        filter: drop-shadow(0 0 3px hsla(240, 25%, 0%, 0.5));
      }
    }
  }
</style>
