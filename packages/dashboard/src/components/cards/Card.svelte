<script lang="ts">
  interface Props {
    block?: boolean
    height?: string
    marginBottom?: string
  }

  let { block = false, height = '', marginBottom = 'mb-4' }: Props = $props()
</script>

<div class="w-full min-w-0 md:w-96 {block ? 'block' : ''} {height} {marginBottom}" style="container-type: inline-size">
  <wa-card class="w-full">
    <slot />
  </wa-card>
</div>
