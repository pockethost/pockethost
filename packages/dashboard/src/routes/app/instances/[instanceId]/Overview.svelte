<script lang="ts">
  import CodeSample from '$components/CodeSample.svelte'
  import CardHeader from '$src/components/cards/CardHeader.svelte'
  import { DISCORD_URL, DOCS_URL, INSTANCE_URL } from '$src/env'
  import { instance } from './store'

  let installSnippet = `npm i pocketbase`

  const url = INSTANCE_URL($instance)

  let connectionSnippet = ''
  $: {
    connectionSnippet = `import PocketBase from 'pocketbase';\n\nconst url = '${url}'\nconst client = new PocketBase(url)`
  }

  let firstQuerySnippet = `const records = await client.collection('posts').getFullList({
    sort: '-created',
});`
</script>

<CardHeader documentation={DOCS_URL(`/usage/accessing-instance/`)}
  >Overview</CardHeader>

<!-- These should be p but the inside already has p -->
<div>
  <p class="mb-2">Your PocketBase URL is</p>
  <CodeSample code={url} isUrl={true} />
</div>

<div>
  <p class="mb-2">Installing PocketBase</p>
  <CodeSample code={installSnippet} />
</div>

<div>
  <p class="mb-2">Connecting to Your Instance</p>
  {#if $instance.cname}
    {#if $instance.cname_active}
      <div class="text-accent">Notice: You are in Custom Domain mode</div>
    {:else}
      <div class="text-error">
        Notice: You are in Custom Domain mode but it is not active and will not
        work. Go find <a href={DISCORD_URL} target="_blank" class="link"
          >@noaxis on Discord</a
        > to get set up.
      </div>
    {/if}
  {/if}
  <CodeSample code={connectionSnippet} />
</div>

<div>
  <p class="mb-2">Making Your First Query</p>
  <CodeSample code={firstQuerySnippet} />
</div>

<div>
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
</div>

