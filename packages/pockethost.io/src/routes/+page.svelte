<script lang="ts">
  import Title from '../components/Title.svelte'
  import Button from '../components/Button/Button.svelte'
  import AuthCheck from '../components/AuthCheck.svelte'
  import Caption from '../components/Caption/Caption.svelte'
    import { CaptionSize } from '../components/Caption/types'
</script>

<AuthCheck>
  <Title third=".io" />
  <main>
    <Caption size={CaptionSize.Hero}>
      The zero config, zero setup <a href="https://pocketbase.io">PocketBase</a>
      backend for your next app.
    </Caption>
    <Button href="/signup">Get Started</Button>
  </main>
</AuthCheck>

<style type="text/scss">
  main {
    text-align: center;
    padding: 1em;
    margin-left: auto;
    margin-right: auto;
  }
</style>
