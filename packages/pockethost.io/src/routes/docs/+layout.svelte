<script lang="ts">
  import { page } from '$app/stores'
  import { PUBLIC_DEBUG } from '$src/env'
  import { pages } from '../../docs'

  const entries = Object.entries(pages).filter(([k, p]) => p.attributes.published || PUBLIC_DEBUG)
  $: pathname = $page.url.pathname
</script>

<div class="docs">
  <div class="sidebar">
    {#each entries as [v, k], i}
      {@const active = pathname.includes(v) || (pathname === '/docs' && v === 'introduction')}
      <a
        class={`nav-link ${k.attributes.published ? '' : 'text-danger'}`}
        href={`/docs/${v}`}
        class:active
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
      inset: 0 auto;
      height: 100vh;
      background: var(--bs-body-bg);
      padding: 1rem;
      border-right: 1px solid var(--bs-gray-300);
    }
    .sidebar > a {
      padding: 8px 16px;
      font-size: 15px;
    }
    .sidebar > a.active {
      background-color: var(--bs-gray-200);
    }
    .body {
      padding: 1rem;
    }
    @media screen and (max-width: 800px) {
      flex-direction: column;
      padding: 1rem;
      .sidebar {
        position: static;
        height: 30vh;
        overflow-y: auto;
        border: 1px solid var(--bs-gray-300);
      }
    }
    ::-webkit-scrollbar {
      width: 4px;
    }
    ::-webkit-scrollbar-thumb {
      background-color: #a9b4bc80;
    }
  }
</style>
