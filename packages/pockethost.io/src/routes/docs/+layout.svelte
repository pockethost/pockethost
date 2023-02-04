<script lang="ts">
  import { PUBLIC_DEBUG } from '$src/env'
  import { pages } from '../../docs'
</script>

<div class="docs">
  <div class="sidebar">
    {#each Object.entries(pages).filter(([k, p]) => p.attributes.published || PUBLIC_DEBUG) as [v, k], i}
      <div>
        <a class={`nav-link ${k.attributes.published ? '' : 'text-danger'}`} href={`/docs/${v}`}
          >{k.attributes.title}</a
        >
      </div>
    {/each}
  </div>
  <div class="body">
    <slot />
  </div>
</div>

<style lang="scss">
  .docs {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    position: relative;

    .sidebar {
      position: sticky;
      top: 0;
      height: max-content;
      background: var(--color-gray-base);
      padding: 2rem 1rem;
    }

    .body {
      grid-column: span 3;
      padding-top: 2rem;
    }
  }
  // .title {
  //   border-bottom: 1px solid gray;
  // }
  // .container {
  //   margin-left: initial;
  //   padding: 10px;
  //   white-space: nowrap;
  //   .toc {
  //     white-space: normal;
  //     width: 200px;
  //     border-right: 1px solid gray;
  //     float: left;
  //     margin-right: 20px;
  //     min-height: 1000px;
  //     div {
  //       font-weight: bold;
  //     }
  //   }
  //   .body {
  //     white-space: normal;
  //     float: left;
  //     width: calc(100% - 300px);
  //   }
  // }
</style>
