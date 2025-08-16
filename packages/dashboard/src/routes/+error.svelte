<script>
  import { page } from '$app/stores'
  import { browser } from '$app/environment'
  import BlurBg from '$components/BlurBg.svelte'
</script>

<svelte:head>
  <title>{$page.status} - PocketHost</title>
</svelte:head>

<BlurBg/>

<main class="relative grid min-h-full place-items-center px-6 py-24 sm:py-32 lg:px-8 z-10" >
  <div class="text-center">
    <p class="text-xl font-semibold text-indigo-300">{$page.status}</p>
    <h1 class="mt-4 text-4xl font-bold tracking-tight text-gray-100 sm:text-5xl">{$page.error?.message}</h1>
    <div class="gif mt-10">
      <img
        src="https://media4.giphy.com/media/V9sdMLcmIFqqk/giphy.gif?cid=790b76118f409453704f5eaabaea1a3dc7380a9daf4fca63&rid=giphy.gif&ct=g"
        alt="Scene from a movie talking about something is missing"
        class="img-fluid w-100"
      />
    </div>
    <div class="mt-10 flex items-center justify-center gap-x-6">
      <a href="/" class="btn  bg-primary hover:bg-light text-white border border-white/10 hover:border-white/15">Go back home</a>
    </div>
  </div>
</main>

<style>
  :global(body) {
    height: 100%;
  }

  .gif {
    max-width: 600px;
  }
</style>
