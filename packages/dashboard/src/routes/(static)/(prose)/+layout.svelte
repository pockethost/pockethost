<script lang="ts">
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
  >
    <slot />
  </article>
</div>
