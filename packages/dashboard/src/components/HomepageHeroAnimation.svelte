<script lang="ts">
  import { fade } from 'svelte/transition'
  import { onMount } from 'svelte'
  import RetroBoxContainer from '$components/RetroBoxContainer.svelte'

  let isReady: boolean = false

  onMount(() => {
    setTimeout(() => {
      isReady = true
    }, 3000)
  })
</script>

<RetroBoxContainer minHeight={500} bgColor="#fff">
  {#if !isReady}
    <div class="hero-animation-content text-center">
      <p>Creating Your New Instance...</p>

      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>
  {/if}

  {#if isReady}
    <div in:fade={{ duration: 1000 }}>
      <img
        src="/images/pocketbase-intro-screen.jpg"
        alt="Screenshot of the Pocketbase Intro UI"
        class="img-fluid"
      />
    </div>
  {/if}
</RetroBoxContainer>

<style>
  .hero-animation-content {
    color: #222;
  }
</style>
