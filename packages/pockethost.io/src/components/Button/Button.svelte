<script lang="ts">
  import { goto } from '$app/navigation'
  import { Button } from 'sveltestrap'
  import { ButtonColors, ButtonSizes } from './types'

  export let color: ButtonColors = ButtonColors.Primary
  export let size: ButtonSizes = ButtonSizes.Normal
  export let disabled = false
  export let href: string = '#'
  export let click: () => void = () => {
    goto(href)
  }
</script>

<div class="button">
  <Button
    class={size}
    {color}
    {disabled}
    block={size === ButtonSizes.Wide}
    size={size === ButtonSizes.Micro ? 'sm' : 'lg'}
    on:click={click}><slot /></Button
  >
</div>

<style lang="scss">
  .button {
    margin: 2px;
    display: inline-block;
  }
</style>
