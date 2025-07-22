<script lang="ts">
  import { page } from '$app/stores'
  import { faHome, faArrowLeft } from '@fortawesome/free-solid-svg-icons'
  import Fa from 'svelte-fa'

  // Check if we're on the blog index page
  $: isIndexPage = $page.url.pathname === '/blog'
</script>

<div class="min-h-screen bg-base-50">
  {#if !isIndexPage}
    <!-- Blog post header with navigation -->
    <div class="bg-base-100 border-b border-base-300 sticky top-0 z-10">
      <div class="max-w-4xl mx-auto px-4 py-4">
        <div class="flex items-center gap-4 mb-4">
          <a href="/blog" class="btn btn-ghost btn-sm gap-2 hover:bg-primary/10 transition-colors">
            <Fa icon={faArrowLeft} size="sm" />
            Back to Blog
          </a>

          <div class="flex items-center gap-2 text-sm text-base-content/60">
            <a href="/" class="hover:text-primary transition-colors">
              <Fa icon={faHome} size="sm" />
            </a>
            <span>/</span>
            <a href="/blog" class="hover:text-primary transition-colors">Blog</a>
            <span>/</span>
            <span class="text-base-content/80">Current Post</span>
          </div>
        </div>

        <!-- Blog branding -->
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center"
          >
            <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path
                d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"
              />
            </svg>
          </div>
          <div>
            <h2 class="text-xl font-bold text-primary">PocketHost Blog</h2>
            <p class="text-sm text-base-content/60">Latest updates and insights</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Blog post content with proper typography -->
    <div class="max-w-4xl mx-auto px-4 py-8">
      <article
        class="prose prose-lg max-w-none prose-headings:text-base-content prose-p:text-base-content/80 prose-a:text-primary hover:prose-a:text-primary-focus prose-strong:text-base-content prose-code:text-primary prose-pre:bg-base-200 prose-blockquote:border-l-primary"
      >
        <slot />
      </article>

      <!-- Post footer -->
      <div class="mt-16 pt-8 border-t border-base-300">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div class="flex items-center gap-4">
            <a href="/blog" class="btn btn-primary btn-outline gap-2">
              <Fa icon={faArrowLeft} size="sm" />
              More Posts
            </a>
          </div>

          <div class="text-sm text-base-content/60">
            <p>
              Have questions? <a
                href="https://discord.gg/nVTxCMEcGT"
                target="_blank"
                class="text-primary hover:underline">Join our Discord</a
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
