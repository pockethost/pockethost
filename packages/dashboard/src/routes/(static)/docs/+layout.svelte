<script>
  // Define the width of the sidebar
  const sidebarWidth = '300px'
  import { page } from '$app/stores'
  import DocLink from './DocLink.svelte'
</script>

<div class="container-fluid mt-4 flex gap-6 flex-col-reverse md:flex-row">
  <div class="w-full md:w-fit bg-base-200 rounded-r-lg py-4">
    <ul class="menu text-base">
      <li class="menu-title">Overview</li>
      <DocLink path="introduction" title="Introduction" />
      <DocLink path="getting-started" title="Getting Started" />
    </ul>
    <ul class="menu">
      <li class="menu-title">Instance Management</li>
      <DocLink path="create" title="Create" />
      <DocLink path="accessing" title="Connect" />
      <DocLink path="power" title="Power" />
      <DocLink path="rename-instance" title="Rename" />
      <DocLink path="delete" title="Delete" />
      <DocLink path="limits" title="Limits" />
      <DocLink path="smtp" title="Outgoing Email" />
      <DocLink path="versions" title="Changing Versions" />
      <DocLink path="s3" title="Using S3 Storage" />
      <DocLink path="custom-binaries" title="Custom Binaries" />
      <DocLink path="custom-domains" title="Custom Domains" />
      <DocLink path="backup-restore" title="Backup/Restore" />
    </ul>
    <ul class="menu">
      <li class="menu-title">Daily Use Guide</li>
      <DocLink path="logs" title="Logging" />
      <DocLink path="dev-mode" title="Dev Mode" />
      <DocLink path="secrets" title="Secrets" />
      <DocLink path="webhooks" title="Webhooks" />
      <DocLink path="ftp" title="FTP Access" />
      <DocLink path="admin-sync" title="Admin Sync" />
      <DocLink path="js" title="Extending via JS" />
    </ul>
    <ul class="menu">
      <li class="menu-title">Programming Guide</li>
      <DocLink path="programming" title="Frontends and JS Hooks" />
      <DocLink path="server-side-pocketbase-antipattern" title="Server-Side PocketBase is an Anti-Pattern" />
    </ul>
    <ul class="menu">
      <li class="menu-title">Appendix</li>
      <DocLink path="account-creation" title="Account Creation" />
      <DocLink path="pricing-ethos" title="Pricing Ethos" />
      <DocLink path="faq" title="FAQ" />
      <DocLink path="gs-gmail" title="Google Suite Gmail Setup" />
      <DocLink path="ses" title="Amazon SES Setup" />
      <DocLink path="self-hosting" title="Self-Hosting" />
    </ul>
  </div>
  <div class="docs-content prose p-5 w-full md:w-fit md:max-w-[50%]">
    <slot />
  </div>
</div>

<style lang="scss">
  .menu,
  .menu-title {
    @apply text-base;
  }
</style>
