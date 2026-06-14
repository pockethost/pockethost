<script lang="ts">
  import Clipboard from '$components/Clipboard.svelte'
  import { Highlight } from 'svelte-highlight'
  import { type LanguageType } from 'svelte-highlight/languages'

  export let text: string
  export let language: LanguageType<'typescript' | 'bash' | 'dns' | 'plaintext'> | undefined = undefined
  export let className = ''

  let isCopied = false

  const handleCopy = () => {
    isCopied = true
    setTimeout(() => {
      isCopied = false
    }, 2000)
  }
</script>

<div class="copy-field {className}">
  <div class="copy-field-content">
    {#if language}
      <Highlight {language} code={text} />
    {:else}
      <pre class="copy-field-plain"><code>{text}</code></pre>
    {/if}
  </div>

  <Clipboard {text} let:copy on:copy={handleCopy}>
    <button type="button" class="copy-field-icon" onclick={copy} aria-label={isCopied ? 'Copied' : 'Copy to clipboard'}>
      <wa-icon name={isCopied ? 'check' : 'copy'}></wa-icon>
    </button>
  </Clipboard>
</div>

<style lang="scss">
  .copy-field {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    border: 1px solid rgb(255 255 255 / 0.08);
    background: rgb(0 0 0 / 0.35);
  }

  .copy-field-content {
    flex: 1;
    min-width: 0;
    overflow-x: auto;
  }

  .copy-field-plain {
    margin: 0;
    padding: 0;
    border: none;
    background: transparent;
    font-family: ui-monospace, SFMono-Regular, 'SF Mono', Consolas, monospace;
    font-size: 0.75rem;
    line-height: 1.5;
    color: rgb(255 255 255 / 0.7);
    white-space: pre;
    overflow-x: auto;
  }

  .copy-field-content :global(pre) {
    margin: 0;
    padding: 0;
    background: transparent;
    overflow-x: auto;
  }

  .copy-field-content :global(pre code.hljs) {
    display: block;
    padding: 0;
    background: transparent;
    font-size: 0.75rem;
    line-height: 1.5;
    white-space: pre;
    overflow-x: auto;
  }

  .copy-field-icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    margin-top: 0.125rem;
    padding: 0;
    border: none;
    border-radius: 0.375rem;
    background: rgb(255 255 255 / 0.08);
    color: rgb(255 255 255 / 0.55);
    cursor: pointer;
    transition:
      color 0.15s,
      background 0.15s;
  }

  .copy-field-icon:hover {
    color: white;
    background: rgb(255 255 255 / 0.14);
  }
</style>
