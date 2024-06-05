<script lang="ts">
  import LoginForm from '$components/login-register/LoginForm.svelte'
  import RegisterForm from '$components/login-register/RegisterForm.svelte'
  import { onMount } from 'svelte'
  import { slide } from 'svelte/transition'

  // Create a toggle to hold the Sign-Up view or the Register view
  let isSignUpView: boolean = true

  onMount(() => {
    // Check the url if the parameter "view" is set and change the form view
    const urlParams = new URLSearchParams(window.location.search)
    const view = urlParams.get('view')

    // Update the view of the form
    if (view === 'login') {
      isSignUpView = false
    }
  })
</script>

<div class="card w-96 bg-zinc-900 mx-auto shadow-xl overflow-hidden">
  {#if isSignUpView}
    <div in:slide={{ delay: 400 }} out:slide>
      <RegisterForm bind:isSignUpView />
    </div>
  {/if}

  {#if !isSignUpView}
    <div in:slide={{ delay: 400 }} out:slide>
      <LoginForm bind:isSignUpView />
    </div>
  {/if}
</div>
