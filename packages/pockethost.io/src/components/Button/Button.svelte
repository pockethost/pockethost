<script lang="ts">
  import { goto } from '$app/navigation'
  import { Button } from 'sveltestrap'
  import { ButtonStyles } from './types'

  export let style: ButtonStyles = ButtonStyles.Wide
  export let disabled = false
  export let href: string = '#'
  export let click: () => void = () => {
    goto(href)
  }
  const size = style === ButtonStyles.Micro ? 'sm' : 'lg'
</script>

<Button
  class={style}
  color={'primary'}
  {disabled}
  block={style === ButtonStyles.Wide}
  {size}
  on:click={click}><slot /></Button
>
