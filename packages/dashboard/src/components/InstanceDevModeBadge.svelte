<script lang="ts">
  interface Props {
    href: string
  }

  let { href }: Props = $props()
</script>

<a
  {href}
  class="inline-flex items-center h-6 px-2 rounded-full text-xs font-medium leading-none border gap-1.5 shrink-0 bg-yellow-500/20 text-yellow-400 border-yellow-500/30 animate-pulse hover:border-yellow-500/50 hover:text-yellow-300 transition-colors"
  title="Dev mode active (slow)"
>
  <span class="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse"></span>
  Dev mode
</a>
