<script lang="ts">
	import { goto } from '$app/navigation'
	import { ButtonStyles } from './types'

	export let style: ButtonStyles = ButtonStyles.Wide
	export let disabled = false
	export let href: string = '#'
	export let click: () => void = () => {
		goto(href)
	}
</script>

<button class={style} {disabled} on:click={click}> <slot /></button>

<style type="text/scss">
	button,
	.button {
		min-width: 100px;
		width: 100px;
		white-space: nowrap;
		border-radius: 5px;
		color: white;
		background: rgb(10, 10, 120);
		display: inline-block;
		margin-left: auto;
		margin-right: auto;
		padding: 10px;
		font-size: 30px;
		&:hover {
			cursor: pointer;
			text-decoration: none;
		}
		&:disabled {
			background: rgb(64, 64, 107);
			color: lightgray;
		}
		&.wide {
			width: 100%;
		}
		&.micro {
			width: initial;
			padding: 2px;
			padding-left: 5px;
			padding-right: 5px;
			min-width: initial;
			max-width: initial;
			font-size: 10px;
		}
	}
</style>
