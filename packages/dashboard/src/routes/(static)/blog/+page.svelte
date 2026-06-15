<script lang="ts">
  import { gravatarUrl } from '$lib/gravatar'
  import { getAuthor } from '$lib/blog/authors'
  import { toc } from './toc'
</script>

<div class="blog-index-shell">
  <div class="blog-index-header">
    <h1 class="blog-index-title">Latest from PocketHost</h1>
    <p class="blog-index-lead">
      Stay updated with new features, platform improvements, and insights from the PocketHost team.
    </p>
  </div>

  <div class="blog-index-grid">
    {#each toc as item, index}
      {@const author = getAuthor(item.author)}
      <a href={item.path} class="blog-card-link">
        <article class="blog-card">
          <div class="blog-card-body">
            {#if index < 3}
              <span class="blog-card-badge">Latest</span>
            {/if}

            <h2 class="blog-card-title">{item.title}</h2>

            {#if item.description}
              <p class="blog-card-description">{item.description}</p>
            {/if}

            <div class="blog-card-footer">
              <div class="blog-card-meta">
                <img src={gravatarUrl(author.email, 20)} alt="" width="20" height="20" />
                <span class="blog-card-meta-handle">{author.handle}</span>
                {#if item.date}
                  <span class="blog-card-meta-sep">·</span>
                  <span>{item.date}</span>
                {/if}
              </div>

              <span class="blog-card-cta">
                Read more
                <wa-icon name="arrow-right"></wa-icon>
              </span>
            </div>
          </div>
        </article>
      </a>
    {/each}
  </div>

  <div class="blog-discord-cta">
    <h3 class="blog-discord-title">Stay in the Loop</h3>
    <p class="blog-discord-lead">
      Join our Discord community to get the latest updates and connect with other PocketHost users.
    </p>
    <a href="https://discord.gg/nVTxCMEcGT" target="_blank" rel="noopener noreferrer" class="blog-discord-button">
      Join Discord Community
      <wa-icon name="discord" family="brands"></wa-icon>
    </a>
  </div>
</div>
