<script lang="ts">
  import { proseCodeBlocks } from '$lib/proseCodeBlocks'
  export let data
  $: ({ pageTitle, description } = data.meta || {})
</script>

<svelte:head>
  <title>{pageTitle ?? 'PocketHost'}</title>
  {#if description}
    <meta name="description" content={description} />
  {/if}
</svelte:head>

<div class="max-w-4xl mx-auto px-4 md:px-20 py-8 md:py-12 z-10 relative">
  <article
    class="prose prose-lg max-w-none prose-headings:text-white prose-p:text-white/80 prose-a:text-primary hover:prose-a:text-secondary prose-strong:text-white prose-code:text-primary prose-pre:bg-neutral-800 prose-blockquote:border-l-primary prose-li:text-white/80"
    use:proseCodeBlocks
  >
    <slot />
  </article>
</div>

<style>
  @reference '../../../app.css';

  :global(.prose h1) {
    @apply text-3xl md:text-4xl font-bold mb-6 mt-0;
  }

  :global(.prose h2) {
    @apply text-2xl md:text-3xl font-bold mb-4 mt-10 pt-2 border-t border-white/10;
  }

  :global(.prose h2:first-of-type) {
    @apply mt-0 pt-0 border-t-0;
  }

  :global(.prose h3) {
    @apply text-xl md:text-2xl font-semibold mb-3 mt-6;
  }

  :global(.prose p) {
    @apply leading-relaxed mb-4;
  }

  :global(.prose ul),
  :global(.prose ol) {
    @apply mb-4 pl-6;
  }

  :global(.prose li) {
    @apply mb-2;
  }

  :global(.prose a) {
    @apply font-medium underline underline-offset-2 decoration-primary/40 hover:decoration-primary;
  }

  :global(.prose :not(pre) > code) {
    @apply bg-neutral-800 px-1.5 py-0.5 rounded text-sm;
  }

  :global(.prose pre code) {
    @apply bg-transparent p-0 rounded-none text-sm;
    display: block;
  }

  :global(.prose blockquote) {
    @apply bg-neutral-800/50 border-l-4 border-l-primary pl-4 py-2 my-4 not-italic text-white/75;
  }
</style>
