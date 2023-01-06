<script lang="ts">
  import { page } from '$app/stores'
  import { pages } from './pages'

  const { pageName } = $page.params
  const md = pages.introduction
</script>

{@html md.body}
