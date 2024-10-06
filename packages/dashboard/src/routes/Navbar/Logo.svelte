<script>
  export let hideLogoText = false
  export let size = 64
</script>

<div class="flex items-center justify-center gap-4">
  <enhanced:img
    src="./pockethost-cloud-logo.jpg"
    class="mix-blend-lighten"
    style="width: {size}px; height: {size}px;"
    alt="PocketHost Logo"
  />
  <h1 class="text-white font-bold text-2xl {hideLogoText && 'sr-only'}">
    PocketHost
  </h1>
</div>
