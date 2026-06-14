<script lang="ts">
  import { gravatarUrl } from '$lib/gravatar'
  import type { BlogAuthor } from '$lib/blog/authors'

  export let author: BlogAuthor
  export let date: string | undefined = undefined
  export let size = 40
</script>

<div class="flex items-center gap-3 mb-8 not-prose">
  <img
    src={gravatarUrl(author.email, size)}
    alt=""
    width={size}
    height={size}
    class="rounded-full shrink-0 bg-white/10"
  />
  <div class="text-sm text-white/60">
    {#if author.url}
      <a
        href={author.url}
        target="_blank"
        rel="noopener noreferrer"
        class="font-medium text-white/80 hover:text-primary dark:hover:text-secondary"
      >
        {author.handle}
      </a>
    {:else}
      <span class="font-medium text-white/80">{author.handle}</span>
    {/if}
    {#if date}
      <span class="mx-2 text-white/40">·</span>
      <time datetime={date}>{date}</time>
    {/if}
  </div>
</div>
