<script>
  export let hideLogoText = false
</script>

<div class="flex items-center justify-center gap-4">
  <enhanced:img
    src="./pockethost-cloud-logo.jpg"
    class="mix-blend-lighten h-12 w-12"
    alt="PocketHost Logo"
  />
  <h1 class="text-white font-bold text-xl hidden md:block ml-1 {hideLogoText && 'sr-only'}">
    PocketHost
  </h1>
</div>
