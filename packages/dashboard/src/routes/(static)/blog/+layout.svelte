<script lang="ts">
  import { page } from '$app/stores'
import { toc } from './toc'

  import { faHome, faArrowLeft } from '@fortawesome/free-solid-svg-icons'
  import Fa from 'svelte-fa'

  // Check if we're on the blog index page
  $: isIndexPage = $page.url.pathname === '/blog'
  $: blogPath = $page.url.pathname.includes('/blog/') ? $page.url.pathname : ''
  $: name = toc.find((entry) => entry.path === blogPath)?.title ?? 'PocketHost Blog';
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
          <a href="/blog" class="btn btn-ghost btn-sm gap-2 hover:bg-primary/10 transition-colors">
            <Fa icon={faArrowLeft} size="sm" /> 
            Back to Blog
          </a>
        </div>
      </div>
    </div>

    <div class="w-full mx-auto px-4 h-24 md:h-32 flex items-center justify-center relative mb-8">
      <img src="/pockethost-cloud-logo.png" class="w-full blur-xl h-full scale-y-[2.5] object-fill absolute top-0 left-0 z-0" alt="">
      <h2 class="text-3xl md:text-5xl max-w-3xl text-center font-bold z-10">{name}</h2>
    </div>

    <!-- Blog post content with proper typography -->
    <div class="max-w-4xl mx-auto px-4 py-8 z-10 relative">
      <article
        class="prose prose-lg max-w-none prose-headings:text-base-content prose-p:text-base-content/80 prose-a:text-primary dark:prose-a:text-secondary hover:prose-a:text-primary-focus prose-strong:text-base-content prose-code:text-primary dark:prose-code:text-secondary prose-pre:bg-base-200 prose-blockquote:border-l-primary"
      >
        <slot />
      </article>

      <!-- Post footer -->
      <div class="mt-16 pt-8 border-t border-base-300">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          

          <div class="text-sm text-base-content/60">
            <p>
              Have questions? <a
                href="https://discord.gg/nVTxCMEcGT"
                target="_blank"
                class="text-primary dark:text-secondary hover:underline">Join our Discord</a
              >
            </p>
          </div>
        </div>
      </div>
    </div>
  {:else}
    <!-- Blog index page - no additional wrapper needed -->
    <slot />
  {/if}
</div>

<style>
  /* Custom prose styling for better readability */
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
    @apply bg-base-200 px-2 py-1 rounded text-sm;
  }

  :global(.prose blockquote) {
    @apply bg-base-100 border-l-4 border-l-primary pl-4 py-2 my-4 italic;
  }

  /* Override prose max-width for full width content */
  :global(.prose) {
    max-width: none;
  }
</style>
