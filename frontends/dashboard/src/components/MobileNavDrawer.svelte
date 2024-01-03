<script>
  import Logo from '$components/Logo.svelte'
</script>

<div class="drawer drawer-end">
  <input id="mobile-nav-drawer" type="checkbox" class="drawer-toggle" />

  <div class="drawer-content">
    <div class="flex items-center justify-between px-8 pt-1">
      <a href="/" class="flex gap-2 items-center justify-center">
        <Logo hideLogoText={true} logoWidth="w-16" />
      </a>

      <label for="mobile-nav-drawer" class="btn drawer-button">
        <i class="fa-regular fa-bars text-2xl"></i>
      </label>
    </div>
  </div>

  <div class="drawer-side z-50">
    <label
      for="mobile-nav-drawer"
      aria-label="close sidebar"
      class="drawer-overlay"
    ></label>

    <div class="h-full">
      <slot />
    </div>
  </div>
</div>
