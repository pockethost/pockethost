<script lang="ts">
  import Card from '$components/cards/Card.svelte'
  import CardHeader from '$components/cards/CardHeader.svelte'
  import { client } from '$src/pocketbase'
  import { instance } from '../store'

  const { renameInstance } = client()

  $: ({ subdomain, id } = $instance)

  // Create a copy of the subdomain
  let formSubdomain = subdomain
  $: {
    formSubdomain = subdomain
  }

  // Controls the disabled state of the button
  let isButtonDisabled = false

  // TODO: What are the limits for this?
  const onRename = (e: Event) => {
    e.preventDefault()

    // Disable the button to prevent double submissions
    isButtonDisabled = true

    // TODO: Set up error handling for when the name is wrong
    // TODO: Do validations like trim and removing numbers
    renameInstance({ instanceId: id, subdomain: formSubdomain }).then(
      () => 'saved',
    )

    // Set the button back to normal
    isButtonDisabled = false
  }
</script>

<Card>
  <CardHeader documentation="https://pockethost.io/docs/usage/rename-instance">
    Rename Instance
  </CardHeader>

  <p class="mb-8">
    Renaming your instance will cause it to become <strong class="text-error"
      >inaccessible</strong
    > by the old instance name. You also may not be able to change it back if someone
    else choose it.
  </p>

  <form
    class="flex rename-instance-form-container-query gap-4"
    on:submit={onRename}
  >
    <input
      type="text"
      bind:value={formSubdomain}
      class="input input-bordered w-full"
    />
    <button type="submit" class="btn btn-error" disabled={isButtonDisabled}
      >Rename Instance</button
    >
  </form>
</Card>

<style>
  .rename-instance-form-container-query {
    flex-direction: column;
  }

  @container (min-width: 400px) {
    .rename-instance-form-container-query {
      flex-direction: row;
    }
  }
</style>
