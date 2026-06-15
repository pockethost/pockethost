<script lang="ts">
  export let title = 'Quick Reference'
  export let className = ''
</script>

<wa-callout
  variant="neutral"
  class="wa-callout-padded wa-callout-subtle-border wa-callout-help wa-callout-reference {className}"
>
  <div class="wa-callout-reference-body">
    {#if title}
      <p class="wa-callout-reference-title">{title}</p>
    {/if}
    {#if $$slots.command}
      <div class="wa-callout-reference-command">
        <slot name="command" />
      </div>
    {/if}
    <slot />
  </div>
</wa-callout>
