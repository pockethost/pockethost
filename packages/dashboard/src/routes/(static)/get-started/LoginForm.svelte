<script lang="ts">
  import { client } from '$src/pocketbase-client'
  import AlertBar from '$components/AlertBar.svelte'
  import { onMount } from 'svelte'

  const { authViaEmail } = client()

  export let isSignUpView: boolean = true

  type WaInputEl = HTMLElement & { value: string }

  let emailInput: WaInputEl
  let passwordInput: WaInputEl

  let email: string = ''
  let password: string = ''
  let formError: string = ''
  let showPassword: boolean = false

  $: isFormButtonDisabled = email.length === 0 || password.length === 0

  let isButtonLoading: boolean = false

  const readWaInputValue = (el: WaInputEl | undefined) => {
    if (!el) return ''
    return el.value ?? el.shadowRoot?.querySelector('input')?.value ?? ''
  }

  const syncFieldValues = () => {
    email = readWaInputValue(emailInput)
    password = readWaInputValue(passwordInput)
  }

  const bindWaInput = (el: WaInputEl, setValue: (value: string) => void) => {
    const sync = () => setValue(readWaInputValue(el))
    el.addEventListener('change', sync)
    const inner = el.shadowRoot?.querySelector('input')
    inner?.addEventListener('input', sync)
    inner?.addEventListener('change', sync)
    return () => {
      el.removeEventListener('change', sync)
      inner?.removeEventListener('input', sync)
      inner?.removeEventListener('change', sync)
    }
  }

  onMount(() => {
    const unbindEmail = emailInput ? bindWaInput(emailInput, (value) => (email = value)) : () => {}
    const unbindPassword = passwordInput ? bindWaInput(passwordInput, (value) => (password = value)) : () => {}
    const autofillInterval = setInterval(syncFieldValues, 250)
    const stopAutofillInterval = setTimeout(() => clearInterval(autofillInterval), 5000)

    document.addEventListener('focusin', syncFieldValues)

    return () => {
      unbindEmail()
      unbindPassword()
      clearInterval(autofillInterval)
      clearTimeout(stopAutofillInterval)
      document.removeEventListener('focusin', syncFieldValues)
    }
  })

  const handleRegisterClick = () => {
    isSignUpView = !isSignUpView
  }

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault()
    syncFieldValues()
    if (!email || !password) return

    isButtonLoading = true
    formError = ''
    showPassword = false
    try {
      await authViaEmail(email, password)
      window.location.href = '/dashboard'
    } catch (error) {
      const e = error as Error
      formError = `Something went wrong with logging you in. ${e.message}`
    }
    isButtonLoading = false
  }
</script>

<form class="p-10 pb-5 flex flex-col gap-2" autocomplete="on" onsubmit={handleSubmit} onpointerdown={syncFieldValues}>
  <h2 class="font-bold text-white mb-3 text-center text-2xl">Log In</h2>

  <div>
    <wa-input
      bind:this={emailInput}
      type="email"
      name="email"
      id="email"
      label="Email"
      placeholder="name@example.com"
      autocomplete="username"
      required
      class="w-full"
    ></wa-input>
  </div>

  <div class="mb-3">
    <div class="relative">
      <wa-input
        bind:this={passwordInput}
        type={showPassword ? 'text' : 'password'}
        name="password"
        id="password"
        label="Password"
        placeholder="Password"
        autocomplete="current-password"
        required
        class="w-full"
      ></wa-input>
      {#if password.length > 0}
        <button
          type="button"
          class="absolute bottom-0 right-4 flex items-center text-gray-500 h-[var(--wa-form-control-height)]"
          onclick={() => (showPassword = !showPassword)}
          tabindex="-1"
        >
          <wa-icon name={showPassword ? 'eye-slash' : 'eye'}></wa-icon>
        </button>
      {/if}
    </div>

    <div class="w-full text-end mt-1">
      <a href="login/password-reset" class="text-sm underline-offset-2 text-secondary text-primary">
        Forgot Password?
      </a>
    </div>
  </div>

  <AlertBar message={formError} type="error" />

  <div class="w-full">
    <wa-button type="submit" variant="brand" class="w-full" disabled={isFormButtonDisabled}>
      {#if isButtonLoading}
        <span class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
      {:else}
        Log In
        <wa-icon slot="end" name="arrow-right"></wa-icon>
      {/if}
    </wa-button>
  </div>
</form>
<wa-divider class="my-0 text-white"></wa-divider>

<div class="p-4 text-sm text-center">
  <div class="mb-2">
    Don't have an account?
    <button type="button" class="text-primary ml-1 dark:text-secondary" onclick={handleRegisterClick}>
      Create A New Account
    </button>
  </div>
</div>
