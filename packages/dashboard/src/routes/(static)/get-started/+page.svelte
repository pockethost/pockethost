<script lang="ts">
  import Logo from '$src/routes/Navbar/Logo.svelte'
  import InstanceGeneratorWidget from '$src/routes/(static)/get-started/InstanceGeneratorWidget.svelte'
</script>

<svelte:head>
  <title>Home - PocketHost</title>
</svelte:head>

<div>
  <div class="min-h-screen flex items-center justify-center">
    <div>
      <Logo />
      <InstanceGeneratorWidget />
    </div>
  </div>
</div>
