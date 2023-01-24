<script lang="ts">
  import { pages } from '../../docs'
</script>

<div class="docs">
  <div class="container">
    <div class="toc">
      {#each Object.entries(pages) as [v, k], i}
        <div><a class="nav-link" href={`/docs/${v}`}>{k.attributes.title}</a></div>
      {/each}
    </div>
    <div class="body">
      <slot />
    </div>
  </div>
</div>

<style lang="scss">
  .title {
    border-bottom: 1px solid gray;
  }
  .container {
    margin-left: initial;
    padding: 10px;
    white-space: nowrap;
    .toc {
      white-space: normal;
      width: 200px;
      border-right: 1px solid gray;
      float: left;
      margin-right: 20px;
      min-height: 1000px;
      div {
        font-weight: bold;
      }
    }
    .body {
      white-space: normal;
      float: left;
      width: calc(100% - 300px);
    }
  }
</style>
