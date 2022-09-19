<script lang="ts">
	import Button from './Button/Button.svelte'
	import { ButtonStyles } from './Button/types'
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
	<Button style={ButtonStyles.Micro} click={copy}>{isCopied ? 'Copied!' : 'Copy'}</Button>
</Clipboard>
