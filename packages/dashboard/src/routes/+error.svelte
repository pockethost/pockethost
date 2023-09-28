<script>
  import { page } from '$app/stores'
</script>

<svelte:head>
  <title>{$page.status} - PocketHost</title>
</svelte:head>

<div class="container text-center py-4">
  <h1 class="mb-5">{$page.status}: {$page.error?.message}</h1>

  <div class="gif mb-5">
    <img
      src="https://media4.giphy.com/media/V9sdMLcmIFqqk/giphy.gif?cid=790b76118f409453704f5eaabaea1a3dc7380a9daf4fca63&rid=giphy.gif&ct=g"
      alt="Scene from a movie talking about something is missing"
      class="img-fluid w-100"
    />
  </div>

  <a href="/" class="btn btn-light"><i class="bi bi-arrow-left-short" /> Back to Home</a>
</div>

<style>
  .gif {
    max-width: 600px;
    margin: 0 auto;
  }
</style>
