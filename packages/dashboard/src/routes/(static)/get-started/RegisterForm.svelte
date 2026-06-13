<script lang="ts">
  import AlertBar from '$components/AlertBar.svelte'
  import { client } from '$src/pocketbase-client'
  import { handleInstanceGeneratorWidget } from '$util/database'
  import { writable } from 'svelte/store'
  import { slide } from 'svelte/transition'
  import NewInstanceProcessingBlock from './NewInstanceProcessingBlock.svelte'
  import { onMount } from 'svelte'

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

  onMount(() => {
    instanceNameField.subscribe(async (name) => {
      if (name === $instanceInfo.name) return
      try {
        instanceInfo.update((info) => ({
          ...info,
          fetching: true,
        }))
        const res = await client().client.send(`/api/signup?name=${encodeURIComponent(name)}`, {})
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
  })

  onMount(() => {
    generateSlug()
  })

  let email: string = ''
  let password: string = ''
  let formError: string = ''

  let isFormButtonDisabled: boolean = true
  $: isFormButtonDisabled =
    email.length === 0 || password.length === 0 || $instanceInfo.name.length === 0 || !$instanceInfo.available

  const handleInstanceNameRegeneration = () => {
    generateSlug()
  }

  const handleLoginClick = () => {
    isSignUpView = !isSignUpView
  }

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault()
    isFormButtonDisabled = true
    isProcessing = true

    await handleInstanceGeneratorWidget(email, password, $instanceInfo.name, (error) => {
      formError = error
    })

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
    <form class="p-10 px-5 md:px-10 pb-5 flex flex-col" onsubmit={handleSubmit}>
      <h2 class="font-bold text-white mb-6 text-center text-2xl">Create your first Instance, fast.</h2>

      <div>
        <label class="block mb-1" for="instance">
          <span>Instance Name</span>
        </label>

        <div class="flex gap-1">
          <wa-input
            type="text"
            placeholder="instance-name"
            value={$instanceNameField}
            oninput={(e) => instanceNameField.set(e.currentTarget.value)}
            id="instance"
            class="w-full"
          ></wa-input>

          <wa-button type="button" variant="neutral" appearance="outline" onclick={handleInstanceNameRegeneration}>
            <wa-icon name="rotate"></wa-icon>
          </wa-button>
        </div>

        <div style="font-size: 15px; padding: 5px">
          {#if $instanceNameField === ''}
            <span class="text-error">Please enter an instance name</span>
          {:else if $instanceInfo.fetching}
            Verifying...
          {:else if $instanceInfo.available}
            <span class="text-success"> https://{$instanceInfo.name}.pockethost.io ✔︎</span>
          {:else if !$instanceInfo.available}
            <span class="text-error"> https://{$instanceInfo.name}.pockethost.io ❌</span>
          {/if}
        </div>
      </div>
      <wa-divider class="my-2 text-white"></wa-divider>

      <div>
        <label class="block mb-1" for="email">
          <span>Email</span>
        </label>

        <wa-input
          type="email"
          id="email"
          placeholder="name@example.com"
          autocomplete="email"
          value={email}
          oninput={(e) => (email = e.currentTarget.value)}
          required
          class="w-full"
        ></wa-input>
      </div>

      <div class="mb-6">
        <label class="block mb-1" for="password">
          <span>Password</span>
        </label>
        <wa-input
          type="password"
          id="password"
          placeholder="Password"
          autocomplete="new-password"
          value={password}
          oninput={(e) => (password = e.currentTarget.value)}
          required
          class="w-full"
        ></wa-input>
      </div>

      <AlertBar message={formError} type="error" />

      <div class="w-full">
        <wa-button type="submit" variant="brand" class="w-full" disabled={isFormButtonDisabled}>
          Create
          <wa-icon slot="end" name="arrow-right"></wa-icon>
        </wa-button>
      </div>
    </form>

    <div class="p-4 text-sm border-t border-white/10 text-center">
      Already have an account?
      <button type="button" class="text-primary ml-1 dark:text-secondary" onclick={handleLoginClick}>Log in</button>
    </div>
  </div>
{/if}
