<script lang="ts">
  import { fade } from 'svelte/transition'
  import { onMount } from 'svelte'

  let isReady: boolean = false

  onMount(() => {
    setTimeout(() => {
      isReady = true
    }, 3000)
  })
</script>

<div class="homepage-hero-animation">
  {#if !isReady}
    <div class="text-center">
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
</div>

<style>
  .homepage-hero-animation {
    background-color: #fff;
    box-shadow: blue 0px 0px 0px 2px inset, rgb(255, 255, 255) 10px -10px 0px -3px,
      rgb(31, 193, 27) 10px -10px, rgb(255, 255, 255) 20px -20px 0px -3px,
      rgb(255, 217, 19) 20px -20px, rgb(255, 255, 255) 30px -30px 0px -3px,
      rgb(255, 156, 85) 30px -30px, rgb(255, 255, 255) 40px -40px 0px -3px,
      rgb(255, 85, 85) 40px -40px;
    border: 1px solid #eee;
    border-radius: 25px;
    padding: 30px;
    margin-right: 45px;
    margin-top: 25px;
    min-height: 500px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  @media screen and (min-width: 768px) {
    .homepage-hero-animation {
      margin: 0;
    }
  }
</style>
