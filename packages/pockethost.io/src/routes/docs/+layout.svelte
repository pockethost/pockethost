<script lang="ts">
  import { page } from '$app/stores'
  import { PUBLIC_DEBUG } from '$src/env'
  import { pages } from '../../docs'

  const entries = Object.entries(pages).filter(([k, p]) => p.attributes.published || PUBLIC_DEBUG)
  $: currentURL = $page.url.pathname
</script>

<div class="docs">
  <div class="sidebar">
    {#each entries as [v, k], i}
      <a
        class={`nav-link ${k.attributes.published ? '' : 'text-danger'}`}
        href={`/docs/${v}`}
        class:active={currentURL.includes(v)}
      >
        {k.attributes.title}
      </a>
    {/each}
  </div>
  <div class="body">
    <slot />
  </div>
</div>

<style lang="scss">
  .docs {
    display: flex;
    position: relative;

    .sidebar {
      min-width: 280px;
      position: sticky;
      top: 0px;
      left: 0;
      height: 100vh;
      background: #f8f9fa;
      padding: 2rem;

      a {
        padding: 8px 16px;
        font-size: 15px;
      }

      .active {
        background-color: #ebeff2;
      }
    }

    .body {
      grid-column: span 3;
      padding: 2rem;
    }

    @media screen and (max-width: 800px) {
      flex-direction: column;
      padding: 1rem;

      .sidebar {
        position: static;
        padding: 1rem;
        height: 30vh;
        overflow-y: auto;
      }

      .body {
        padding: 2rem 0;
      }
    }
  }
</style>
