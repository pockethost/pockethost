<script>
  // Define the width of the sidebar
  const sidebarWidth = '300px'
</script>

<div class="container flex">
  <div
    class="sidebar w-fit bg-neutral text-neutral-content whitespace-nowrap p-5 pt-0"
  >
    <div class="heading">Overview</div>
    <a href="/docs">Hello.</a>
    <a href="/docs/getting-started">Getting Started</a>

    <div class="heading">Core Concepts</div>
    <a href="/docs/admin-sync">Admin Sync</a>
    <a href="/docs/create">Creating an Instance</a>
    <a href="">Custom Domains</a>
    <a href="">Deleting an Instance</a>
    <a href="">Dev Mode</a>
    <a href="">Using JS Hooks</a>
    <a href="">FTP Access</a>
    <a href="">Using S3 Storage</a>
    <a href="">Cron</a>
    <a href="">Backups</a>
    <a href="">Powering on/off</a>
    <a href="">Changing Versions</a>
    <a href="">Usage Limits</a>
    <a href="">Outgoing Email</a>
    <a href="">Custom Binaries</a>
    <a href="">Rate Limits</a>

    <div class="heading">Speed Runs</div>
    <a href="">Migrating to S3 Storage</a>

    <div class="heading">Self-Hosting</div>

    <div class="heading">Appendix</div>
    <a href="/docs/account-creation">Account Creation</a>
    <a href="/docs/pricing-ethos">Pricing Ethos</a>
    <a href="/docs/faq">FAQ</a>

    <!-- Sidebar content goes here -->
  </div>
  <div class="docs-content w-fit prose p-5">
    <slot />
  </div>
</div>

<style lang="scss">
  .heading {
    @apply text-lg font-bold text-neutral-100 pt-5;
  }
  .container {
    a {
      @apply link block;
    }
  }
</style>
