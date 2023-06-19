<script lang="ts">
  import CodeSample from '$components/CodeSample.svelte'
  import { client } from '$src/pocketbase'
  import type { SaveSecretsPayload } from '@pockethost/common'
  import { createCleanupManager } from '@pockethost/common'
  import { forEach, reduce } from '@s-libs/micro-dash'
  import { onDestroy, onMount } from 'svelte'
  import AccordionItem from '../../../../../components/AccordionItem.svelte'
  import { instance } from '../store'
  import Form from './Form.svelte'
  import List from './List.svelte'
  import SvgIcons from './SvgIcons.svelte'
  import { items } from './stores'

  $: ({ id, secrets } = $instance)

  const cm = createCleanupManager()
  onMount(() => {
    items.clear()
    forEach(secrets || {}, (value, name) => {
      items.create({ name, value })
    })
    const unsub = items.subscribe(async (secrets) => {
      await client().saveSecrets({
        instanceId: id,
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

<AccordionItem title="Secrets">
  <p>These secrets are passed into your Deno cloud worker as environment variables.</p>
  <CodeSample
    code={$items
      .map((secret) => `const ${secret.name} = Deno.env.get('${secret.name}')`)
      .join('\n')}
  />

  <SvgIcons />
  <Form />
  <List />
</AccordionItem>

<style lang="scss">
  .secrets {
    box-sizing: border-box;
    padding: 0;
    margin: 0;
  }
  .secrets {
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
