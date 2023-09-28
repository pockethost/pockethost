<script lang="ts">
  import CopyButton from '$components/CopyButton.svelte'
  import { logger } from '@pockethost/common'
  import { Highlight } from 'svelte-highlight'
  import { typescript, type LanguageType } from 'svelte-highlight/languages'

  const { dbg } = logger()

  export let code: string
  export let language: LanguageType<'typescript' | 'bash'> = typescript

  const handleCopy = () => {
    dbg('copied')
  }
</script>

<div class="copy-container">
  <Highlight {language} {code} />

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
