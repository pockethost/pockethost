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
    items.upsert({ name, value })
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
<div class="container">
  <h2>Add an Environment Variable</h2>
  <section>
    <!-- display a form with 2 fields
        - input[type="text"], describing the name
        - input[type="number"], describing the value (price, cost, currently undecided)

    -->
    <!-- wrap each input in a label -->
    <label>
      <span>Name</span>
      <input class="form-control" required type="text" bind:value={name} />
    </label>
    <label>
      <span>Value</span>
      <input class="form-control" bind:value placeholder="" type="password" />
    </label>

    <!-- describe the action of the icon button through aria attributes -->
    <button
      class="btn btn-primary"
      aria-label="Create entry"
      aria-describedby="description"
      disabled={!isFormValid}
      on:click={() => handleSubmit()}
      >Add
    </button>
    {#if !isKeyValid && name.length > 0}
      <div class="text-danger">
        All key names must be upper case, alphanumeric, and may include
        underscore (_).
      </div>
    {/if}
  </section>
</div>

<style lang="scss">
  .container {
    border: 1px solid black;
    margin: 20px;
    padding: 20px;
    width: 300px;
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
        margin: 10px;
        input {
          font-size: 1.1rem;
          color: inherit;
          font-family: inherit;
          background: none;
          padding: 0.5rem 0.75rem;
        }
      }
    }
  }
</style>
