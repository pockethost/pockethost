<script>
  import { DISCORD_URL } from '$lib/appEnv'

  const SUPPORT_EMAIL = 'hello@pockethost.io'
</script>

<svelte:head>
  <title>Support - PocketHost</title>
</svelte:head>

<div class="container mx-auto py-8 px-4 md:px-20 max-w-3xl">
  <h1 class="font-bold text-4xl mb-3">Support</h1>
  <p class="text-white/70 mb-10">
    Need help with your instance, billing, or the platform? Discord is the fastest way to reach us and the community.
  </p>

  <section class="blog-discord-cta mt-0 text-left">
    <p class="text-sm font-semibold uppercase tracking-wide text-[#5865f2] mb-2">Recommended</p>
    <h2 class="blog-discord-title text-left">Join us on Discord</h2>
    <p class="blog-discord-lead mx-0 mb-6">
      Over 1,500 PocketBase and PocketHost developers share answers, report issues, and get direct help from the team.
      Most questions are answered within hours, often minutes.
    </p>
    <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" class="blog-discord-button">
      Join Discord Community
      <wa-icon name="discord" family="brands"></wa-icon>
    </a>
  </section>

  <section class="mt-12">
    <h2 class="font-bold text-2xl mb-3">Email</h2>
    <p class="text-white/70 mb-2">
      Prefer email or need to share something private? Write to
      <a class="text-primary" href="mailto:{SUPPORT_EMAIL}">{SUPPORT_EMAIL}</a>.
    </p>
    <p class="text-white/60 text-sm">Pro subscribers receive priority email support.</p>
  </section>
</div>
