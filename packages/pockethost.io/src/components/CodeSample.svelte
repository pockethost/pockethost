<script lang="ts">
  import { Highlight } from 'svelte-highlight'
  import { typescript } from 'svelte-highlight/languages'
  import 'svelte-highlight/styles/github.css'
  import CopyButton from './CopyButton.svelte'

  export let code: string
  const handleCopy = () => {
    console.log('copied')
  }
</script>

<div class="copy-container">
  <Highlight language={typescript} {code} />
  <div class="copy-button">
    <CopyButton {code} copy={handleCopy} />
  </div>
</div>

<style type="text/scss">
  .copy-container {
    position: relative;
    margin: 5px;
    border: 1px solid gray;

    .copy-button {
      position: absolute;
      top: 2px;
      right: 2px;
    }
  }
</style>
