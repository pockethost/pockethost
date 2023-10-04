<script lang="ts">
  import Card from '$components/cards/Card.svelte'
  import CardHeader from '$components/cards/CardHeader.svelte'
  import { client } from '$src/pocketbase'
  import { instance } from '../store'

  $: ({ id, maintenance } = $instance)

  let version = $instance.version

  // Controls the disabled state of the button
  let isButtonDisabled = false

  // Update the version number
  const handleSave = async (e: Event) => {
    e.preventDefault()

    // Disable the button to prevent double submissions
    isButtonDisabled = true

    // Save to the database
    client()
      .saveVersion({ instanceId: id, version: version })
      .then(() => {
        return 'saved'
      })

    // Set the button back to normal
    isButtonDisabled = false
  }
</script>

<Card>
  <CardHeader documentation="https://pockethost.io/docs/usage/upgrading">
    Version Change
  </CardHeader>

  <p class="mb-8">
    Changing your version can only be done when the instance is in maintenance
    mode. We recommend you <strong>do a full backup</strong> before making a
    change. The version number uses the semver syntax and any
    <a
      href="https://www.npmjs.com/package/pocketbase?activeTab=versions"
      class="link">supported PocketBase version</a
    > should work.
  </p>

  <form
    class="flex change-version-form-container-query gap-4"
    on:submit={handleSave}
  >
    <input
      type="text"
      bind:value={version}
      class="input input-bordered w-full"
    />
    <button
      type="submit"
      class="btn btn-error"
      disabled={!maintenance || isButtonDisabled}>Change Version</button
    >
  </form>
</Card>

<style>
  .change-version-form-container-query {
    flex-direction: column;
  }

  @container (min-width: 400px) {
    .change-version-form-container-query {
      flex-direction: row;
    }
  }
</style>
