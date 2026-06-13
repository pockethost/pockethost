<script lang="ts">
  import LoginForm from './LoginForm.svelte'
  import RegisterForm from './RegisterForm.svelte'
  import { onMount } from 'svelte'
  import { slide } from 'svelte/transition'

  export let login = false
  let isSignUpView: boolean = !login

  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const view = urlParams.get('view')

    if (view === 'login') {
      isSignUpView = false
    }
  })
</script>

<wa-card class="w-[100%] lg:w-4/12 bg-[#111111]/80 border border-white/10 shadow-md overflow-hidden">
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
</wa-card>
