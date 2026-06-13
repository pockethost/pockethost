<script lang="ts">
  interface Props {
    disabled?: boolean
    style?: 'primary' | 'warning' | 'danger' | 'success'
    className?: string
    click?: () => void
  }

  let { disabled = false, style = 'primary', className = '', click = () => {} }: Props = $props()

  const variantMap = {
    primary: 'brand',
    warning: 'warning',
    danger: 'danger',
    success: 'success',
  } as const
</script>

<wa-button
  variant={variantMap[style]}
  size="small"
  class={className}
  {disabled}
  onclick={click}
>
  <slot />
</wa-button>
