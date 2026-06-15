<script lang="ts">
  import Logo from '$src/routes/Navbar/Logo.svelte'
  import InstanceGeneratorWidget from '$src/routes/(static)/get-started/InstanceGeneratorWidget.svelte'
</script>

<svelte:head>
  <title>Home - PocketHost</title>
</svelte:head>

<div class="w-full flex items-center justify-center px-4 md:px-16 py-10 md:py-16">
  <InstanceGeneratorWidget />
</div>
