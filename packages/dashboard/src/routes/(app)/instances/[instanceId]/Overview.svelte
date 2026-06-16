<script lang="ts">
  import CodeSample from '$components/CodeSample.svelte'
  import { plaintext } from 'svelte-highlight/languages'

  import { INSTANCE_URL } from '$lib/appEnv'

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

<h2 class="text-xl font-bold text-white mb-6">Overview</h2>

<wa-card class="border border-white/10 bg-[#111111]/80 shadow-lg overflow-hidden">
  <div class="wa-card-body wa-card-body--lg wa-stack-lg">
    <div>
      <p class="text-xs font-medium uppercase tracking-wide text-white/50 mb-2">PocketBase URL</p>
      <CodeSample code={url} language={plaintext} />
    </div>

    <div>
      <p class="text-xs font-medium uppercase tracking-wide text-white/50 mb-2">Installing PocketBase</p>
      <CodeSample code={installSnippet} />
    </div>

    <div>
      <p class="text-xs font-medium uppercase tracking-wide text-white/50 mb-2">Connecting to Your Instance</p>
      <CodeSample code={connectionSnippet} />
    </div>

    <div>
      <p class="text-xs font-medium uppercase tracking-wide text-white/50 mb-2">Making Your First Query</p>
      <CodeSample code={firstQuerySnippet} />
    </div>

    <div class="pt-2 border-t border-white/10">
      <p class="text-xs font-medium uppercase tracking-wide text-white/50 mb-3">Additional Resources</p>
      <ul class="space-y-2 text-sm">
        <li>
          <a href="https://pocketbase.io/docs/api-records/" target="_blank" class="text-primary hover:underline"
            >PocketBase Web APIs</a
          >
        </li>
        <li>
          <a href="https://www.npmjs.com/package/pocketbase" target="_blank" class="text-primary hover:underline"
            >PocketBase NPM Package</a
          >
        </li>
      </ul>
    </div>
  </div>
</wa-card>
