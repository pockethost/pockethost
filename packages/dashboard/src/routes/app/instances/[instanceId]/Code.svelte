<script lang="ts">
  import CodeSample from '$components/CodeSample.svelte'
  import { PUBLIC_APP_DOMAIN, PUBLIC_APP_PROTOCOL } from '$src/env'
  import { instance } from './store'

  let installSnippet = `npm i pocketbase`;

  let connectionSnippet = ''
  $: {
    const url = `${PUBLIC_APP_PROTOCOL}://${$instance.subdomain}.${PUBLIC_APP_DOMAIN}`
    connectionSnippet = `import PocketBase from 'pocketbase';\n\nconst url = '${url}'\nconst client = new PocketBase(url)`
  }

  let firstQuerySnippet = `const records = await client.collection('posts').getFullList({
    sort: '-created',
});`;
</script>

<div class='card card-body bg-base-200 h-full'>
  <h3 class='text-xl font-bold mb-4'>Getting Started</h3>

  <div class='mb-4'>
    <p>Installing PocketBase</p>
    <CodeSample code={installSnippet} />
  </div>

  <div class='mb-4'>
    <p>Connecting to Your Instance</p>
    <CodeSample code={connectionSnippet} />
  </div>

  <div class='mb-4'>
    <p>Making Your First Query</p>
    <CodeSample code={firstQuerySnippet} />
  </div>

  <p>Additional Resources:</p>
  <ul class='list-disc pl-4'>
    <li><a href='https://pocketbase.io/docs/api-records/' target='_blank' class='link'>PocketBase Web APIs</a></li>
    <li><a href='https://www.npmjs.com/package/pocketbase' target='_blank' class='link'>PocketBase NPM Package</a></li>
  </ul>
</div>