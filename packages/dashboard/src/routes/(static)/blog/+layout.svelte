<script lang="ts">
  import { page } from '$app/stores'
  import BlogAuthor from '$components/BlogAuthor.svelte'
  export let data

  $: isIndexPage = $page.url.pathname === '/blog'
  $: ({ title, pageTitle, description, ogType } = data.meta || {})
  $: ({ author, date } = data)
  $: ogImage = title ? `https://cdn.cheto.app/og/joioes1x8zagn0v?name=${encodeURIComponent(title)}` : undefined
</script>

<svelte:head>
  <title>{pageTitle}</title>
  <meta name="description" content={description} />

  <meta property="og:url" content={data.url} />
  <meta property="og:type" content={ogType} />
  <meta property="og:title" content={pageTitle} />
  {#if description}
    <meta property="og:description" content={description} />
  {/if}
  {#if ogImage}
    <meta property="og:image" content={ogImage} />
  {/if}

  <meta name="twitter:card" content="summary_large_image" />
  <meta property="twitter:url" content={data.url} />
  <meta name="twitter:title" content={pageTitle} />
  {#if description}
    <meta name="twitter:description" content={description} />
  {/if}
  {#if ogImage}
    <meta name="twitter:image" content={ogImage} />
  {/if}
</svelte:head>

<div class="min-h-screen">
  {#if !isIndexPage}
    <div class="sticky top-0 z-30 bg-[#111111] border-b border-white/10">
      <div class="max-w-4xl mx-auto px-4 md:px-8 py-4">
        <a href="/blog" class="blog-back-link">
          <wa-icon name="arrow-left"></wa-icon>
          Back to Blog
        </a>
      </div>
    </div>

    <div class="max-w-4xl mx-auto px-4 md:px-8 pt-10 pb-4 text-center">
      <h1 class="text-3xl md:text-5xl font-bold text-white leading-tight">{title}</h1>
    </div>

    <div class="max-w-4xl mx-auto px-4 md:px-8 py-8">
      {#if author}
        <div class="flex justify-center">
          <BlogAuthor {author} {date} />
        </div>
      {/if}
      <article
        class="prose prose-lg max-w-none prose-headings:text-white prose-p:text-white/80 prose-a:text-primary hover:prose-a:text-secondary prose-strong:text-white prose-code:text-primary prose-pre:bg-neutral-800 prose-blockquote:border-l-primary"
      >
        <slot />
      </article>

      <div class="mt-16 pt-8 border-t border-neutral-800">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div class="text-sm text-white/60">
            <p>
              Have questions?
              <a
                href="https://discord.gg/nVTxCMEcGT"
                target="_blank"
                class="text-primary hover:text-secondary hover:underline">Join our Discord</a
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
