<script lang="ts">
  import CopyButton from '$components/CopyButton.svelte'
  import { dbg } from '$util/logger'
  import { Highlight } from 'svelte-highlight'
  import { typescript } from 'svelte-highlight/languages'
  import 'svelte-highlight/styles/github.css'

  export let code: string
  const handleCopy = () => {
    dbg('copied')
  }
</script>

<div class="copy-container">
  <Highlight language={typescript} {code} />

  <div class="copy-button">
    <CopyButton {code} copy={handleCopy} />
  </div>
</div>

<style lang="scss">
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
