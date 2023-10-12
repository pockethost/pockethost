<script lang="ts">
  import CodeSample from '$components/CodeSample.svelte'
  import Card from '$components/cards/Card.svelte'
  import CardHeader from '$components/cards/CardHeader.svelte'
  import { DOCS_URL, INSTANCE_URL } from '$src/env'
  import { instance } from './store'

  let installSnippet = `npm i pocketbase`

  let connectionSnippet = ''
  $: {
    const url = INSTANCE_URL($instance.subdomain)
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
    <CodeSample code={connectionSnippet} />
  </div>

  <div class="mb-4">
    <p>Making Your First Query</p>
    <CodeSample code={firstQuerySnippet} />
  </div>

  <p>Additional Resources:</p>
  <ul class="list-disc pl-4">
    <li>
      <a href={DOCS_URL(`/api-records/`)} target="_blank" class="link"
        >PocketBase Web APIs</a
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
