<script lang="ts">
  import Logo from '$src/routes/Navbar/Logo.svelte'
  import InstanceGeneratorWidget from '$src/routes/(static)/get-started/InstanceGeneratorWidget.svelte'
  import BlurBg from '$components/BlurBg.svelte'
</script>

<svelte:head>
  <title>Home - PocketHost</title>
</svelte:head>

<div>
  <div class="py-12 ">
    <div class="w-full flex items-center justify-center px-10 md:px-16">
      <!-- <Logo /> -->
      <InstanceGeneratorWidget />
    </div>
  </div>
</div>
