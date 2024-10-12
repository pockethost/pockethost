<script lang="ts">
  import CopyButton from '$components/CopyButton.svelte'
  import { Highlight } from 'svelte-highlight'
  import { typescript, type LanguageType } from 'svelte-highlight/languages'
  import a11yDark from "svelte-highlight/styles/a11y-dark";

  export let code: string
  export let language: LanguageType<'typescript' | 'bash' | 'dns'> = typescript

  const handleCopy = () => {}
</script>

<svelte:head>
  {@html a11yDark}
</svelte:head>

<div class="copy-container">
  <Highlight {language} {code} />

  <div class="copy-button">
    <CopyButton {code} copy={handleCopy} />
  </div>
</div>

<style lang="scss">
  .copy-container {
    position: relative;
    border-radius: 16px;
    overflow: hidden;

    .copy-button {
      transition: all 300ms;
      opacity: 0;
      position: absolute;
      top: 8px;
      right: 8px;
    }

    &:hover {
      .copy-button {
        opacity: 1;
      }
    }
  }
</style>
