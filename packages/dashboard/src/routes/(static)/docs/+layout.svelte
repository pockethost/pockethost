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

    <div class="heading">Instance Management</div>
    <a href="/docs/create">Create</a>
    <a href="/docs/accessing">Connect</a>
    <a href="/docs/power">Power</a>
    <a href="/docs/rename-instance">Rename</a>
    <a href="/docs/delete">Delete</a>
    <a href="/docs/limits">Limits</a>
    <a href="/docs/smtp">Outgoing Email</a>
    <a href="/docs/versions">Changing Versions</a>
    <a href="/docs/s3">Using S3 Storage</a>
    <a href="#">Custom Binaries (soon)</a>
    <a href="/docs/custom-domains">Custom Domains</a>
    <a href="/docs/backup-restore">Backup/Restore</a>

    <div class="heading">Daily Use Guide</div>
    <a href="/docs/logs">Logging</a>
    <a href="/docs/dev-mode">Dev Mode</a>
    <a href="/docs/secrets">Secrets</a>
    <a href="/docs/ftp">FTP Access</a>
    <a href="/docs/admin-sync">Admin Sync</a>

    <div class="heading">Programming Guide</div>
    <a href="/docs/programming">Frontends and JS Hooks</a>

    <div class="heading">Self-Hosting</div>

    <div class="heading">Appendix</div>
    <a href="/docs/account-creation">Account Creation</a>
    <a href="/docs/pricing-ethos">Pricing Ethos</a>
    <a href="/docs/faq">FAQ</a>
    <a href="/docs/gs-gmail">Google Suite Gmail Setup</a>
    <a href="/docs/ses">Amazon SES Setup</a>

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
