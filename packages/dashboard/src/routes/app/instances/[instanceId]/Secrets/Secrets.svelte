<script lang="ts">
  import CodeSample from '$components/CodeSample.svelte'
  import { client } from '$src/pocketbase'
  import {
    createCleanupManager,
    logger,
    type SaveSecretsPayload,
  } from '@pockethost/common'
  import { forEach, reduce } from '@s-libs/micro-dash'
  import { onDestroy, onMount } from 'svelte'
  import { instance } from '../store'
  import Form from './Form.svelte'
  import List from './List.svelte'
  import { items } from './stores'
  import Card from '$components/cards/Card.svelte'
  import CardHeader from '$components/cards/CardHeader.svelte'

  // TODO: Hot Reload is causing an infinite loop in the network tab for some reason. Wasn't able to figure out why

  $: ({ id, secrets } = $instance)

  // Keep track of which tab the user has selected
  let activeTab = 0

  // Toggle between the tabs on click
  const handleTabChange = (id: number) => {
    activeTab = id
  }

  const { dbg } = logger().create(`Secrets.svelte`)

  const cm = createCleanupManager()

  onMount(() => {
    items.clear()

    forEach(secrets || {}, (value, name) => {
      items.upsert({ name, value })
    })

    let initial = false

    const unsub = items.subscribe(async (secrets) => {
      if (!initial) {
        initial = true
        return
      }

      dbg(`Got change`, secrets)

      await client().saveSecrets({
        instanceId: id,
        secrets: reduce(
          secrets,
          (c, v) => {
            const { name, value } = v
            c[name] = value
            return c
          },
          {} as SaveSecretsPayload['secrets'],
        ),
      })
    })

    cm.add(unsub)
  })

  onDestroy(cm.shutdown)
</script>

<Card>
  <CardHeader>Secrets</CardHeader>

  <p class="mb-4">
    These secrets are passed into your <code>pocketbase</code> executable and
    can be accessed from <code>pb_hooks</code> JS hooks.
  </p>

  <!-- If the user has any secrets, render them in a code block -->
  {#if $items.length > 0}
    <div class="mb-8">
      <CodeSample code={`const YOUR_KEY = process.env.YOUR_KEY`} />
    </div>
  {/if}

  {#if $items.length === 0}
    <div class="alert border-2 border-neutral mb-8">
      <i class="fa-regular fa-shield-keyhole"></i>
      <span>No Environment Variables Found</span>
    </div>
  {/if}

  <div class="tabs mb-4 border-b-[1px] border-neutral">
    <button
      on:click={() => handleTabChange(0)}
      type="button"
      class="tab border-b-2 {activeTab === 0
        ? 'tab-active font-bold border-base-content'
        : 'border-neutral'}"
      ><i class="fa-regular fa-plus mr-2"></i> Add New</button
    >

    <button
      on:click={() => handleTabChange(1)}
      type="button"
      class="tab border-b-2 {activeTab === 1
        ? 'tab-active font-bold border-base-content'
        : 'border-neutral'}"
      ><i class="fa-regular fa-list mr-2"></i> Current List</button
    >
  </div>

  <div>
    {#if activeTab === 0}
      <Form />
    {/if}

    {#if activeTab === 1}
      <List />
    {/if}
  </div>
</Card>
