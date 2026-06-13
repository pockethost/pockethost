<script lang="ts">
  import { page } from '$app/stores'
  import { toc } from './toc'
  import { cloudLogo } from '$lib/brand'

  $: isIndexPage = $page.url.pathname === '/blog'
  $: blogPath = $page.url.pathname.includes('/blog/') ? $page.url.pathname : ''
  $: name = toc.find((entry) => entry.path === blogPath)?.title ?? 'PocketHost Blog'
</script>

<svelte:head>
  <title>{name} - PocketHost</title>
  <meta name="description" content="Stay updated with the latest PocketHost features, tutorials, and community news." />
</svelte:head>

<div class="min-h-screen">
  {#if !isIndexPage}
    <div class="sticky top-0 z-10 px-4 md:px-20">
      <div class="w-full mx-auto h-32 py-4">
        <div class="flex items-center gap-4 mb-4">
          <wa-button href="/blog" variant="neutral" size="small" appearance="plain">
            <wa-icon slot="start" name="arrow-left"></wa-icon>
            Back to Blog
          </wa-button>
        </div>
      </div>
    </div>

    <div class="w-full mx-auto px-4 h-24 md:h-32 flex items-center justify-center relative mb-8">
      <img
        src={cloudLogo}
        class="w-full blur-xl h-full scale-y-[2.5] object-fill absolute top-0 left-0 z-0"
        alt=""
      />
      <h2 class="text-3xl md:text-5xl max-w-3xl text-center font-bold z-10">{name}</h2>
    </div>

    <div class="max-w-4xl mx-auto px-4 py-8 z-10 relative">
      <article
        class="prose prose-lg max-w-none prose-headings:text-white prose-p:text-white/80 prose-a:text-primary dark:prose-a:text-secondary hover:prose-a:text-primary-focus prose-strong:text-white prose-code:text-primary dark:prose-code:text-secondary prose-pre:bg-neutral-800 prose-blockquote:border-l-primary"
      >
        <slot />
      </article>

      <div class="mt-16 pt-8 border-t border-neutral-800">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div class="text-sm text-white/60">
            <p>
              Have questions?
              <a href="https://discord.gg/nVTxCMEcGT" target="_blank" class="text-primary dark:text-secondary hover:underline"
                >Join our Discord</a
              >
            </p>
          </div>
        </div>
      </div>
    </div>
  {:else}
    <slot />
  {/if}
</div>

<style>
  :global(.prose h1) {
    @apply text-3xl md:text-4xl font-bold mb-6 mt-0;
  }

  :global(.prose h2) {
    @apply text-2xl md:text-3xl font-bold mb-4 mt-8;
  }

  :global(.prose h3) {
    @apply text-xl md:text-2xl font-semibold mb-3 mt-6;
  }

  :global(.prose p) {
    @apply leading-relaxed mb-4;
  }

  :global(.prose ul) {
    @apply mb-4 pl-6;
  }

  :global(.prose li) {
    @apply mb-2;
  }

  :global(.prose a) {
    @apply font-medium underline-offset-2 decoration-2 hover:decoration-primary/60;
  }

  :global(.prose code) {
    @apply bg-neutral-800 px-2 py-1 rounded text-sm;
  }

  :global(.prose blockquote) {
    @apply bg-neutral-800 border-l-4 border-l-primary pl-4 py-2 my-4 italic;
  }

  :global(.prose) {
    max-width: none;
  }
</style>
