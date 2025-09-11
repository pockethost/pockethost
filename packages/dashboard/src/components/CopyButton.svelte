<script lang="ts">
  import Clipboard from '$components/Clipboard.svelte'
  import TinyButton from '$components/helpers/TinyButton.svelte'

  let isCopied = false
  export let code: string
  export let copy: () => void

  const handleCopy = () => {
    isCopied = true
    copy()
  }
</script>

<Clipboard text={code} let:copy on:copy={handleCopy}>
  <TinyButton className="bg-primary border-transparent hover:bg-light text-white" click={copy} style={isCopied ? 'success' : 'primary'}>{isCopied ? 'Copied!' : 'Copy'}</TinyButton>
</Clipboard>
