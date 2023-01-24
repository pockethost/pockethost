<script lang="ts">
  import { browser } from '$app/environment'
  import { page } from '$app/stores'
  import { pages, type PageName } from '$src/docs'
  import hljs from 'highlight.js'
  import { tick } from 'svelte'

  let md: DocPage
  $: {
    const { pageName } = $page.params
    md = pages[pageName as PageName]
    tick().then(() => {
      if (browser) {
        hljs.highlightAll()
      }
    })
  }
</script>

{#if !md.attributes.published}
  <div class="text-danger">Draft</div>
{/if}
{@html md.body}
