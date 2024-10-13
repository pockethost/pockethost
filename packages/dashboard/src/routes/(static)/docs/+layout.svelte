<script>
  // Define the width of the sidebar
  const sidebarWidth = '300px'
  import { page } from '$app/stores';
</script>

<div class="container-fluid mt-4 flex gap-6 flex-col-reverse md:flex-row">
  <div class="w-full md:w-fit bg-base-200 rounded-r-lg py-4">
    <ul class="menu text-base">
      <li class="menu-title">Overview</li>
      <li><a class:active={$page.url.pathname.endsWith("/docs")} href="/docs">Introduction</a></li>
      <li><a class:active={$page.url.pathname.endsWith("/docs/getting-started")} href="/docs/getting-started">Getting Started</a></li>
    </ul>
    <ul class="menu">
      <li class="menu-title">Instance Management</li>
      <li><a class:active={$page.url.pathname.endsWith("/docs/create")} href="/docs/create">Create</a></li>
      <li><a class:active={$page.url.pathname.endsWith("/docs/accessing")} href="/docs/accessing">Connect</a></li>
      <li><a class:active={$page.url.pathname.endsWith("/docs/power")} href="/docs/power">Power</a></li>
      <li><a class:active={$page.url.pathname.endsWith("/docs/rename-instance")} href="/docs/rename-instance">Rename</a></li>
      <li><a class:active={$page.url.pathname.endsWith("/docs/delete")} href="/docs/delete">Delete</a></li>
      <li><a class:active={$page.url.pathname.endsWith("/docs/limits")} href="/docs/limits">Limits</a></li>
      <li><a class:active={$page.url.pathname.endsWith("/docs/smtp")} href="/docs/smtp">Outgoing Email</a></li>
      <li><a class:active={$page.url.pathname.endsWith("/docs/versions")} href="/docs/versions">Changing Versions</a></li>
      <li><a class:active={$page.url.pathname.endsWith("/docs/s3")} href="/docs/s3">Using S3 Storage</a></li>
      <li><a class:active={$page.url.pathname.endsWith("/docs/custiom-binaries")} href="/docs/custom-binaries">Custom Binaries</a></li>
      <li><a class:active={$page.url.pathname.endsWith("/docs/custom-domains")} href="/docs/custom-domains">Custom Domains</a></li>
      <li><a class:active={$page.url.pathname.endsWith("/docs/backup-restore")} href="/docs/backup-restore">Backup/Restore</a></li>
    </ul>
    <ul class="menu">
      <li class="menu-title">Daily Use Guide</li>
      <li><a class:active={$page.url.pathname.endsWith("/docs/logs")} href="/docs/logs">Logging</a></li>
      <li><a class:active={$page.url.pathname.endsWith("/docs/dev-mode")} href="/docs/dev-mode">Dev Mode</a></li>
      <li><a class:active={$page.url.pathname.endsWith("/docs/secrets")} href="/docs/secrets">Secrets</a></li>
      <li><a class:active={$page.url.pathname.endsWith("/docs/ftp")} href="/docs/ftp">FTP Access</a></li>
      <li><a class:active={$page.url.pathname.endsWith("/docs/admin-sync")} href="/docs/admin-sync">Admin Sync</a></li>
      <li><a class:active={$page.url.pathname.endsWith("/docs/js")} href="/docs/js">Extending via JS</a></li>
    </ul>
    <ul class="menu">
      <li class="menu-title">Programming Guide</li>
      <li><a class:active={$page.url.pathname.endsWith("/docs/programming")} href="/docs/programming">Frontends and JS Hooks</a></li>
    </ul>
    <ul class="menu">
      <li class="menu-title">Appendix</li>
      <li><a class:active={$page.url.pathname.endsWith("/docs/account-creation")} href="/docs/account-creation">Account Creation</a></li>
      <li><a class:active={$page.url.pathname.endsWith("/docs/pricing-ethos")} href="/docs/pricing-ethos">Pricing Ethos</a></li>
      <li><a class:active={$page.url.pathname.endsWith("/docs/faq")} href="/docs/faq">FAQ</a></li>
      <li><a class:active={$page.url.pathname.endsWith("/docs/gs-gmail")} href="/docs/gs-gmail">Google Suite Gmail Setup</a></li>
      <li><a class:active={$page.url.pathname.endsWith("/docs/ses")} href="/docs/ses">Amazon SES Setup</a></li>
      <li><a class:active={$page.url.pathname.endsWith("/docs/self-hosting")} href="/docs/self-hosting">Self-Hosting</a></li>
    </ul>
  </div>
  <div class="docs-content prose p-5 w-full md:w-fit md:max-w-[50%]">
    <slot />
  </div>
</div>

<style lang="scss">
  .menu, .menu-title {
    @apply text-base
  }
</style>
