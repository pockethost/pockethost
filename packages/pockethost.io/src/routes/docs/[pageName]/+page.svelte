<script lang="ts">
  import { browser } from '$app/environment'
  import { page } from '$app/stores'
  import hljs from 'highlight.js'
  import { tick } from 'svelte'
  import { pages, type PageName } from '../pages'

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

{@html md.body}
