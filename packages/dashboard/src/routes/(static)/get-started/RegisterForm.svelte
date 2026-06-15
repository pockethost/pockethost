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
    <form class="auth-form" onsubmit={handleSubmit}>
      <h2 class="auth-form-title">Create your first Instance, fast.</h2>

      <div class="auth-field-group">
        <label class="auth-label" for="instance">Instance Name</label>

        <div class="flex gap-2">
          <wa-input
            type="text"
            placeholder="instance-name"
            value={$instanceNameField}
            oninput={(e: Event) => instanceNameField.set((e.currentTarget as HTMLInputElement).value)}
            id="instance"
            class="w-full"
          ></wa-input>

          <wa-button type="button" variant="neutral" appearance="outline" onclick={handleInstanceNameRegeneration}>
            <wa-icon name="rotate"></wa-icon>
          </wa-button>
        </div>

        <div class="text-sm text-white/70">
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

      <div class="auth-field-group">
        <label class="auth-label" for="email">Email</label>

        <wa-input
          type="email"
          id="email"
          placeholder="name@example.com"
          autocomplete="email"
          value={email}
          oninput={(e: Event) => (email = (e.currentTarget as HTMLInputElement).value)}
          required
          class="w-full"
        ></wa-input>
      </div>

      <div class="auth-field-group">
        <label class="auth-label" for="password">Password</label>
        <wa-input
          type="password"
          id="password"
          placeholder="Password"
          autocomplete="new-password"
          value={password}
          oninput={(e: Event) => (password = (e.currentTarget as HTMLInputElement).value)}
          required
          class="w-full"
        ></wa-input>
      </div>

      <AlertBar message={formError} type="error" />

      <button type="submit" class="auth-submit" disabled={isFormButtonDisabled}>
        Create
        <wa-icon name="arrow-right"></wa-icon>
      </button>
    </form>

    <div class="auth-footer">
      Already have an account?
      <button type="button" class="auth-footer-button" onclick={handleLoginClick}>Log in</button>
    </div>
  </div>
{/if}
