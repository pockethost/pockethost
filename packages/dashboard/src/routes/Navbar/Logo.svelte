<script>
  import { cloudLogo as logo } from '$lib/brand'

  export let hideLogoText = false
  export let className = ''
</script>

<div class="flex items-center justify-center gap-4 {className}">
  <img
    src={logo}
    class="mix-blend-lighten h-12 w-12 shrink-0"
    width="48"
    height="48"
    alt="PocketHost Logo"
    fetchpriority="high"
    loading="eager"
    decoding="async"
  />
  <h1 class="text-white font-bold text-xl hidden md:block {hideLogoText && 'sr-only'}">PocketHost</h1>
</div>
