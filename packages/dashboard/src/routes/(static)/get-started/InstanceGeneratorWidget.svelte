<script lang="ts">
  import LoginForm from './LoginForm.svelte'
  import RegisterForm from './RegisterForm.svelte'
  import { onMount } from 'svelte'
  import { slide } from 'svelte/transition'
  import { readCheckoutPvIdFromSearch } from '$util/checkoutIntent'

  export let login = false
  let isSignUpView: boolean = !login
  let checkoutPvId = ''

  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const view = urlParams.get('view')

    if (view === 'login') {
      isSignUpView = false
    }

    checkoutPvId = readCheckoutPvIdFromSearch(window.location.search)
  })
</script>

<div class="auth-card w-full max-w-md">
  {#if isSignUpView}
    {#if login}
      <RegisterForm bind:isSignUpView {checkoutPvId} />
    {:else}
      <div in:slide={{ delay: 400 }} out:slide>
        <RegisterForm bind:isSignUpView {checkoutPvId} />
      </div>
    {/if}
  {/if}

  {#if !isSignUpView}
    {#if login}
      <LoginForm bind:isSignUpView {checkoutPvId} />
    {:else}
      <div in:slide={{ delay: 400 }} out:slide>
        <LoginForm bind:isSignUpView {checkoutPvId} />
      </div>
    {/if}
  {/if}
</div>
