<script lang="ts">
  import Logo from '$src/routes/Navbar/Logo.svelte'
  import InstanceGeneratorWidget from '$components/login-register/InstanceGeneratorWidget.svelte'
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
