<script lang="ts">
  import AlertBar from '$components/AlertBar.svelte'
  import { client } from '$src/pocketbase-client'
  import { handleInstanceGeneratorWidget } from '$util/database'
  import { writable } from 'svelte/store'
  import { slide } from 'svelte/transition'
  import NewInstanceProcessingBlock from './NewInstanceProcessingBlock.svelte'

  export let isSignUpView: boolean = false
  let isProcessing: boolean = false

  const instanceNameField = writable('')
  const instanceInfo = writable({
    name: '',
    fetching: true,
    available: false,
  })

  const generateSlug = async () => {
    instanceInfo.update((info) => ({ ...info, fetching: true }))
    const { instanceName: name } = await client().client.send(`/api/signup`, {})
    instanceInfo.update((info) => ({
      ...info,
      available: true,
      name,
      fetching: false,
    }))
    instanceNameField.set(name)
  }

  instanceNameField.subscribe(async (name) => {
    if (name === $instanceInfo.name) return
    try {
      instanceInfo.update((info) => ({
        ...info,
        fetching: true,
      }))
      const res = await client().client.send(
        `/api/signup?name=${encodeURIComponent(name)}`,
        {},
      )
      instanceInfo.update((info) => ({
        ...info,
        fetching: false,
        available: true,
        name,
      }))
    } catch (e) {
      instanceInfo.update((info) => ({
        ...info,
        fetching: false,
        available: false,
        name,
      }))
    }
  })

  generateSlug()

  // Set up the variables to hold the form information
  let email: string = ''
  let password: string = ''
  let formError: string = ''

  // Disable the form button until all fields are filled out
  let isFormButtonDisabled: boolean = true
  $: isFormButtonDisabled =
    email.length === 0 ||
    password.length === 0 ||
    $instanceInfo.name.length === 0 ||
    !$instanceInfo.available

  // Generate a unique name for the PocketHost instance
  const handleInstanceNameRegeneration = () => {
    generateSlug()
  }

  // Toggle between registration and login forms
  const handleLoginClick = () => {
    isSignUpView = !isSignUpView
  }

  // Handle the form submission
  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault()
    isFormButtonDisabled = true
    isProcessing = true

    await handleInstanceGeneratorWidget(
      email,
      password,
      $instanceInfo.name,
      (error) => {
        formError = error
      },
    )

    isFormButtonDisabled = false

    setTimeout(() => {
      isProcessing = false
    }, 1000)
  }
</script>

{#if isProcessing}
  <div in:slide={{ delay: 400 }} out:slide>
    <NewInstanceProcessingBlock />
  </div>
{:else}
  <div in:slide={{ delay: 400 }} out:slide>
    <form class="card-body" on:submit={handleSubmit}>
      <h2 class="font-bold text-white mb-3 text-center text-2xl">
        You are 30 seconds away from your first <br />PocketBase Instance
      </h2>

      <div class="mb-3">
        <label class="label" for="instance">
          <span class="label-text">Instance Name</span>
        </label>

        <div class="input-group">
          <input
            type="text"
            placeholder="instance-name"
            bind:value={$instanceNameField}
            id="instance"
            class="input input-bordered w-full"
          />

          <button
            type="button"
            class="btn btn-square"
            on:click={handleInstanceNameRegeneration}
          >
            <i class="fa-solid fa-rotate"></i>
          </button>
        </div>

        <div style="font-size: 15px; padding: 5px">
          {#if $instanceInfo.fetching}
            Verifying...
          {:else if $instanceInfo.available}
            <span class="text-success">
              https://{$instanceInfo.name}.pockethost.io ✔︎</span
            >
          {:else}
            <span class="text-error">
              https://{$instanceInfo.name}.pockethost.io ❌</span
            >
          {/if}
        </div>
      </div>

      <div class="mb-3">
        <label class="label" for="id">
          <span class="label-text">Email</span>
        </label>

        <input
          type="email"
          class="input input-bordered w-full"
          id="email"
          placeholder="name@example.com"
          autocomplete="email"
          bind:value={email}
          required
        />
      </div>

      <div class="mb-12">
        <label class="label" for="password">
          <span class="label-text">Password</span>
        </label>
        <input
          type="password"
          class="input input-bordered w-full"
          id="password"
          placeholder="Password"
          autocomplete="new-password"
          bind:value={password}
          required
        />
      </div>

      <AlertBar message={formError} type="error" />

      <div class="card-actions justify-end">
        <button
          type="submit"
          class="btn btn-primary"
          disabled={isFormButtonDisabled}
        >
          Create <i class="fa-solid fa-arrow-right"></i>
        </button>
      </div>
    </form>

    <div class="p-4 bg-zinc-800 text-center">
      Already have an account? <button
        type="button"
        class="link font-bold"
        on:click={handleLoginClick}>Login</button
      >
    </div>
  </div>
{/if}
