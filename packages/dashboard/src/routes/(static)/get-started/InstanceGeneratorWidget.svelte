<script lang="ts">
  import BlurBg from '$components/BlurBg.svelte'
  import LoginForm from './LoginForm.svelte'
  import RegisterForm from './RegisterForm.svelte'
  import { onMount } from 'svelte'
  import { slide } from 'svelte/transition'

  export let login = false
  // Create a toggle to hold the Sign-Up view or the Register view
  let isSignUpView: boolean = !login

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

<BlurBg />

<div class="card w-[100%]  lg:w-4/12 bg-[#111111]/80 border border-white/10 shadow-md overflow-hidden">
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
