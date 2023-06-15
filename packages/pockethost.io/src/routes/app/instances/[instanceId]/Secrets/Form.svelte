<script lang="ts">
  import { SECRET_KEY_REGEX } from '@pockethost/common'
  // import the items as described in the store
  import { items } from './stores.js'

  // variables bound to the input elements
  let name: string = ''
  let value: string = ''
  let isKeyValid = false
  let isValueValid = false
  let isFormValid = false

  // following the submit event, proceed to update the store by adding the item or updating its value (if existing)
  const handleSubmit = () => {
    // findIndex returns -1 if a match is not found
    const index = $items.findIndex((item) => item.name === name)
    if (index === -1) {
      items.create({ name, value })
    } else {
      items.update({ name, value })
    }
    name = ''
    value = ''
  }

  $: {
    name = name.toUpperCase()
    value = value.trim()
    isKeyValid = !!name.match(SECRET_KEY_REGEX)
    isValueValid = value.length > 0
    isFormValid = isKeyValid && isValueValid
    console.log({ isFormValid })
  }
</script>

<!-- form component
    introduce the component with a heading
    describe the form with input elements of type text and number
-->
<section>
  <!-- display a form with 2 fields
        - input[type="text"], describing the name
        - input[type="number"], describing the value (price, cost, currently undecided)

    -->
  <!-- wrap each input in a label -->
  <label>
    <span>Key</span>
    <input required type="text" bind:value={name} />
  </label>
  <label>
    <span>Value</span>
    <input type="password" bind:value placeholder="" />
  </label>

  <!-- describe the action of the icon button through aria attributes -->
  <button
    aria-label="Create entry"
    aria-describedby="description"
    disabled={!isFormValid}
    on:click={() => handleSubmit()}
  >
    <span id="description" hidden>Add the key value pair to the list of items</span>
    <svg viewBox="0 0 100 100" width="40" height="40">
      <use href="#create" />
    </svg>
  </button>
  {#if !isKeyValid && name.length > 0}
    <div class="text-danger">
      All key names must be upper case, alphanumeric, and may include underscore (_).
    </div>
  {/if}
</section>

<style lang="scss">
  h2 {
    font-size: 13pt;
  }
  /* display the input in a wrapping row
        flip the hue for the color and background
    */
  section {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    color: var(--bs-gray-600);
    background: var(--bs-gray-100);
    padding: 0.75rem 1rem;
    border-radius: 5px;
    margin-bottom: 20px;
    label {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      font-size: 1rem;
      line-height: 2;
      input {
        font-size: 1.1rem;
        color: inherit;
        font-family: inherit;
        background: none;
        border: none;
        padding: 0.5rem 0.75rem;
        border-left: 0.25rem solid currentColor;
      }
    }
    button {
      align-self: flex-end;
      background: none;
      border: none;
      color: inherit;
      width: 2.75rem;
      height: 2.75rem;
      padding: 0.25rem;
      margin: 0.25rem 0;
      &:disabled {
        opacity: 0.5;
      }
      svg {
        display: block;
        width: 100%;
        height: 100%;
      }
    }
  }
</style>
