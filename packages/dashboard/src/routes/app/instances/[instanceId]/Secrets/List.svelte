<script type="ts">
  // import the items as described in the store
  import { items } from './stores'
</script>

{#if $items.length > 0}
  <!-- introduce the section with a heading and describe the items in a main element -->
  <section>
    <!-- display the articles in a grid, specifying the name and numerical values in a column -->
    <main>
      {#each $items as item}
        <article style="border-color: {item.color}">
          <h2>{item.name}</h2>
          <div class="value">
            {item.value.slice(0, 2)}{item.value.slice(2).replaceAll(/./g, '*')}
          </div>
          <!-- following a click on the button update the store with the delete operation -->
          <button on:click={() => items.delete(item.name)} aria-label="Delete">
            <svg viewBox="0 0 100 100" width="30" height="30">
              <use href="#delete" />
            </svg>
          </button>
        </article>
      {/each}
    </main>
  </section>
{/if}

<style lang="scss">
  /* display the items as squares in a grid */
  main {
    display: grid;
    justify-content: center;
    grid-template-columns: repeat(auto-fill, 150px);
    grid-auto-rows: 150px;
    grid-gap: 2rem;
  }
  /* display the text elements in a column */
  article {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background: hsla(240, 25%, 50%, 0.1);
    border: 5px solid currentColor;
    border-radius: 25px;
    position: relative;
    h2 {
      font-weight: 400;
      font-size: 10pt;
    }

    .value {
      font-size: 10pt;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 700;
      overflow: hidden;
      width: 100%;
      padding-left: 5px;
      padding-right: 5px;
    }

    button {
      position: absolute;
      top: 0%;
      right: 0%;
      transform: translate(50%, -50%);
      background: none;
      border: none;
      border-radius: 50%;
      width: 1.5rem;
      height: 1.5rem;
      color: inherit;
      background: currentColor;
      /* use the same hue as the background to fake a clip on the border underneath */
      box-shadow: 0 0 0 0.5rem hsl(240, 25%, 20%);
      svg {
        display: block;
        width: 100%;
        height: 100%;
        color: hsl(240, 25%, 20%);
      }
    }
  }
  /* absolute position the button in the top right corner */
</style>
