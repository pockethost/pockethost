<script lang="ts">
  import { toc } from './toc'

  const postDates: Record<string, string> = {
    '/blog/auto-vacuum': 'Jun 13, 2026',
    '/blog/sftp-file-access': 'Jun 13, 2026',
    '/blog/pocketbase-sqlite-vacuum': 'Jun 13, 2026',
    '/blog/runtime-status-sync': 'Jun 13, 2026',
    '/blog/node-24-leaner-runtime': 'Jun 12, 2026',
    '/blog/instance-power-status': 'Jun 12, 2026',
    '/blog/web-awesome-migration': 'Jun 12, 2026',
    '/blog/pocketbase-version-sync': 'Jun 12, 2026',
    '/blog/pockethost-2-3-0-release': 'Jul 22, 2025',
    '/blog/webhooks-launch': 'Jul 22, 2025',
    '/blog/mothership-mirror-service': 'Jul 21, 2025',
    '/blog/custom-domains-automation': 'Jul 19, 2025',
    '/blog/kingdom': 'Jan 15, 2025',
    '/blog/hard-paywall-is-live': 'Jan 10, 2025',
    '/blog/announcing-dev-channel': 'Jan 8, 2025',
    '/blog/hard-paywall': 'Jan 6, 2025',
    '/blog/announcing-pocker': 'Dec 20, 2024',
  }
</script>

<div class="mx-auto px-4 md:px-20 z-10 relative">
  <div class="py-16 text-center">
    <h1
      class="text-5xl font-bold mb-4 bg-gradient-to-r from-white to-primary dark:to-secondary bg-clip-text text-transparent"
    >
      Latest from PocketHost
    </h1>
    <p class="text-lg text-white/70 max-w-2xl mx-auto">
      Stay updated with new features, platform improvements, and insights from the PocketHost team.
    </p>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {#each toc as item, index}
      <div class="group">
        <a href={item.path} class="block h-full transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
          <wa-card class="h-full border border-white/10 bg-[#111111]/30 shadow-lg hover:border-white/50">
            <div class="p-6 flex flex-col h-full">
              {#if index < 3}
                <wa-badge variant="brand" class="mb-3 w-fit">Latest</wa-badge>
              {/if}

              <h2 class="text-xl font-bold mb-3 transition-colors duration-300 line-clamp-2">
                {item.title}
              </h2>

              {#if item.description}
                <p class="text-white/70 text-sm mb-4 line-clamp-3">
                  {item.description}
                </p>
              {/if}

              <div class="flex items-center justify-between mt-auto">
                {#if postDates[item.path]}
                  <div class="flex items-center gap-2 text-xs text-white/60">
                    <wa-icon name="calendar"></wa-icon>
                    <span>{postDates[item.path]}</span>
                  </div>
                {/if}

                <div
                  class="flex items-center gap-2 text-primary dark:text-secondary group-hover:gap-3 transition-all duration-300"
                >
                  <span class="text-sm font-medium">Read more</span>
                  <wa-icon
                    name="arrow-right"
                    class="transform group-hover:translate-x-1 transition-transform duration-300"
                  ></wa-icon>
                </div>
              </div>
            </div>
          </wa-card>
        </a>
      </div>
    {/each}
  </div>

  <div class="mt-16 bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
    <h3 class="text-2xl font-bold mb-3">Stay in the Loop</h3>
    <p class="text-white/70 mb-6 max-w-lg mx-auto">
      Join our Discord community to get the latest updates and connect with other PocketHost users.
    </p>
    <wa-button
      href="https://discord.gg/nVTxCMEcGT"
      target="_blank"
      rel="noopener noreferrer"
      variant="brand"
      size="large"
      class="bg-[#5865F2] hover:bg-[#3b4aed]"
    >
      Join Discord Community
      <wa-icon slot="end" name="discord" family="brands"></wa-icon>
    </wa-button>
  </div>
</div>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .bg-clip-text {
    -webkit-background-clip: text;
    background-clip: text;
  }
</style>
