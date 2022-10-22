<script lang="ts">
  import Clipboard from './Clipboard.svelte'

  let isCopied = false
  export let code: string
  export let copy: () => void

  const handleCopy = () => {
    isCopied = true
    copy()
  }
</script>

<Clipboard text={code} let:copy on:copy={handleCopy}>
  <button class="btn btn-primary btn-sm" on:click={copy}>{isCopied ? 'Copied!' : 'Copy'}</button>
</Clipboard>
