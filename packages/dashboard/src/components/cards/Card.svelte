<script lang="ts">
  interface Props {
    block?: boolean
    height?: string
    marginBottom?: string
  }

  let { block = false, height = '', marginBottom = 'mb-4' }: Props = $props()
</script>

<wa-card class="w-full md:w-96 {block ? 'block' : ''} {height} {marginBottom}" style="container-type: inline-size">
  <slot />
</wa-card>
