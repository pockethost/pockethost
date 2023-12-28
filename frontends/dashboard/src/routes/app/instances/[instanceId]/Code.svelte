<script lang="ts">
  import CodeSample from '$components/CodeSample.svelte'
  import Card from '$components/cards/Card.svelte'
  import CardHeader from '$components/cards/CardHeader.svelte'
  import { INSTANCE_URL } from '$src/env'
  import { instance } from './store'

  let installSnippet = `npm i pocketbase`

  let connectionSnippet = ''
  $: {
    const url = INSTANCE_URL($instance)
    connectionSnippet = `import PocketBase from 'pocketbase';\n\nconst url = '${url}'\nconst client = new PocketBase(url)`
  }

  let firstQuerySnippet = `const records = await client.collection('posts').getFullList({
    sort: '-created',
});`
</script>

<Card>
  <CardHeader>Getting Started</CardHeader>

  <div class="mb-4">
    <p>Installing PocketBase</p>
    <CodeSample code={installSnippet} />
  </div>

  <div class="mb-4">
    <p>Connecting to Your Instance</p>
    {#if $instance.cname}
      {#if $instance.cname_active}
        <div class="text-accent">Notice: You are in Custom Domain mode</div>
      {:else}
        <div class="text-error">
          Notice: You are in Custom Domain mode but it is not active and will
          not work. Go find <a
            href="https://discord.com/channels/1128192380500193370/1189948945967882250"
            target="_blank"
            class="link">@noaxis on Discord</a
          > to get set up.
        </div>
      {/if}
    {/if}
    <CodeSample code={connectionSnippet} />
  </div>

  <div class="mb-4">
    <p>Making Your First Query</p>
    <CodeSample code={firstQuerySnippet} />
  </div>

  <p>Additional Resources:</p>
  <ul class="list-disc pl-4">
    <li>
      <a
        href={`https://pocketbase.io/docs/api-records/`}
        target="_blank"
        class="link">PocketBase Web APIs</a
      >
    </li>
    <li>
      <a
        href="https://www.npmjs.com/package/pocketbase"
        target="_blank"
        class="link">PocketBase NPM Package</a
      >
    </li>
  </ul>
</Card>
