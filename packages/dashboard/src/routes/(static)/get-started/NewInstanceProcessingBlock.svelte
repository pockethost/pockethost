<script lang="ts">
  // Fun quotes when waiting for the instance to load. This could take up to 10 seconds
  let processingQuote =
    'Did you know it takes fourteen sentient robots to create each instance on PocketHost?'
</script>

<div class="card-body">
  <div class="text-center">
    <span class="loading loading-spinner loading-lg mb-4"></span>

    <div>
      <h2 class="mb-12 font-bold text-white text-2xl">
        Creating Your New Instance...
      </h2>

      <p class="italic">{processingQuote}</p>
    </div>
  </div>
</div>
