<script lang="ts">
  import BlurBg from '$components/BlurBg.svelte'
import { toc } from './toc'
  import { faCalendarAlt, faArrowRight } from '@fortawesome/free-solid-svg-icons'
  import Fa from 'svelte-fa'

  // Extract date from blog posts - we'll create a mapping for the major ones
  const postDates: Record<string, string> = {
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

  const postDescriptions: Record<string, string> = {
    '/blog/pockethost-2-3-0-release':
      'Our biggest release yet! Introducing webhooks, automated custom domains, hard paywall, and major infrastructure improvements.',
    '/blog/webhooks-launch':
      'Automate your PocketBase workflows with our new webhooks feature - more reliable than cron jobs.',
    '/blog/mothership-mirror-service':
      'Enhanced infrastructure for better data synchronization and dashboard performance.',
    '/blog/custom-domains-automation':
      'Fully automated custom domain setup with Cloudflare integration and SSL certificates.',
    '/blog/kingdom': 'Follow along as we build a realtime multiplayer game using PocketBase.',
    '/blog/hard-paywall-is-live': 'The hard paywall is now active for new users, with existing users grandfathered in.',
    '/blog/announcing-dev-channel': 'Our new YouTube channel for PocketBase tutorials and ecosystem content.',
    '/blog/hard-paywall': "Why we're moving to a hard paywall model and what it means for the community.",
    '/blog/announcing-pocker': 'Introducing our custom container solution for global PocketBase hosting.',
  }
</script>

<svelte:head>
  <title>Blog - PocketHost</title>
  <meta name="description" content="Stay updated with the latest PocketHost features, tutorials, and community news." />
</svelte:head>

<BlurBg className="opacity-40"/>
<div class="mx-auto px-4 md:px-20 z-10 relative">
  <div class="py-16 text-center">
    <h1
      class="text-5xl font-bold mb-4 bg-gradient-to-r from-white to-primary dark:to-secondary bg-clip-text text-transparent"
    >
      Latest from PocketHost
    </h1>
    <p class="text-lg text-base-content/70 max-w-2xl mx-auto">
      Stay updated with new features, platform improvements, and insights from the PocketHost team.
    </p>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {#each toc as item, index}
      <div class="group">
        <a href={item.path} class="block h-full transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
          <div class="card border-white/10 shadow-lg h-full border  hover:border-white/50">
            <div class="card-body p-6">
              <!-- Featured badge for latest posts -->
              {#if index < 3}
                <div class="badge badge-primary badge-sm mb-3">Latest</div>
              {/if}

              <h2
                class="card-title text-xl font-bold mb-3 transition-colors duration-300 line-clamp-2"
              >
                {item.title}
              </h2>

              {#if postDescriptions[item.path]}
                <p class="text-base-content/70 text-sm mb-4 line-clamp-3">
                  {postDescriptions[item.path]}
                </p>
              {/if}

              <div class="flex items-center justify-between mt-auto">
                {#if postDates[item.path]}
                  <div class="flex items-center gap-2 text-xs text-base-content/60">
                    <Fa icon={faCalendarAlt} size="sm" />
                    <span>{postDates[item.path]}</span>
                  </div>
                {/if}

                <div class="flex items-center gap-2 text-primary dark:text-secondary group-hover:gap-3 transition-all duration-300">
                  <span class="text-sm font-medium">Read more</span>
                  <Fa
                    icon={faArrowRight}
                    size="sm"
                    class="transform group-hover:translate-x-1 transition-transform duration-300"
                  />
                </div>
              </div>
            </div>
          </div>
        </a>
      </div>
    {/each}
  </div>

  <!-- Newsletter/Subscribe section -->
  <div class="mt-16 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-8 text-center">
    <h3 class="text-2xl font-bold mb-3">Stay in the Loop</h3>
    <p class="text-base-content/70 mb-6 max-w-lg mx-auto">
      Join our Discord community to get the latest updates and connect with other PocketHost users.
    </p>
    <a
      href="https://discord.gg/nVTxCMEcGT"
      target="_blank"
      rel="noopener noreferrer"
      class="btn btn-primary btn-lg gap-2 hover:scale-105 transition-transform duration-300"
    >
      Join Discord Community
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path
          d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.010c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
        />
      </svg>
    </a>
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
