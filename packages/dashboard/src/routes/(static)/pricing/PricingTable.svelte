<script lang="ts">
  import FeatureName from '$src/routes/(static)/pricing/FeatureName.svelte'
  import FeatureSupportBlock from './FeatureSupportBlock.svelte'
  import { PLAN_NAMES, SubscriptionType } from 'pockethost/common'
  import { isUserVerified, userStore } from '$src/util/stores'

  interface Item {
    name: string
    items: string[]
    isNew?: boolean
    info?: string
  }

  const items: Item[] = [
    {
      name: 'Number of Instances',
      items: ['25', '250'],
      info: `Each instance can have its own domain, database, and files.`,
    },
    {
      name: 'Bandwidth (per month, per instance)',
      items: ['1GB', '100GB'],
      info: `Bandwidth means all data transferred in or out of your PocketHost instance. This includes all HTTP traffic, file downloads, and admin panel usage.`,
    },
    {
      name: 'Local Storage (per instance)',
      items: ['1GB', '10GB'],
      info: `Local storage means storage on the PocketBase disk volume. S3 storage is recommended for large files and does not count toward the local storage limit.`,
    },
    {
      name: 'Max local inodes (per instance)',
      items: ['100', '1,000'],
      info: `An inode is typically a file or directory on disk. The inode limit counts toward static files, databases, and other files that are stored on the local volume of your PocketHost instance. Files stored using the S3 link (recommended) do not count toward the inode limit.`,
    },
    {
      name: 'CPU',
      items: ['Unlimited', 'Unlimited'],
      info: `Your PocketBase instance runs in a Docker container. While there are practical limits, we do not meter or throttle CPU usage.`,
    },

    {
      name: 'FTP access',
      items: ['YesBlock', 'YesBlock'],
    },
    {
      name: 'Run every version of PocketBase',
      items: ['YesBlock', 'YesBlock'],
      info: `We support the latest version of every minor release of PocketBase.`,
    },
    {
      name: 'Secure infrastructure',
      items: ['YesBlock', 'YesBlock'],
    },

    {
      name: 'Community Discord',
      items: ['YesBlock', 'YesBlock'],
    },
    {
      name: 'Custom Domains',
      items: ['NoBlock', 'YesBlock'],
    },
    { name: 'Pro Discord', items: ['NoBlock', 'YesBlock'] },
  ]
</script>

<div class="mx-auto">
  <section aria-labelledby="comparison-heading">
    <h2 id="comparison-heading" class="sr-only">Feature comparison</h2>

    <div class="-mt-6 space-y-16">
      <div>
        <div class="relative -mx-8 mt-10">
          <table class="relative w-full border-separate border-spacing-x-8">
            <thead>
              <tr class="text-left">
                <th scope="col">
                  <span class="sr-only">Feature</span>
                </th>
                <th scope="col" class="text-center">
                  {PLAN_NAMES[SubscriptionType.Free]}
                </th>
                <th scope="col" class="text-center">
                  {PLAN_NAMES[SubscriptionType.Premium]}
                </th>
              </tr>
              <tr>
                <th></th>
                <th>Free Forever</th>
                <th>
                  <div class="flex flex-col justify-center">
                    {#if $userStore && $isUserVerified}
                      <a
                        href="https://store.pockethost.io/checkout/buy/8e7cfb35-846a-4fd6-adcb-c2db5589275d?checkout[custom][user_id]={$userStore?.id}"
                        class="btn btn-sm btn-neutral lemonsqueezy-button mb-2"
                      >
                        $20/mo
                      </a>
                      <a
                        href="https://store.pockethost.io/checkout/buy/96e4ab4b-f646-4fb2-b830-5584db983e73?checkout[custom][user_id]={$userStore?.id}"
                        class="btn btn-sm btn-neutral lemonsqueezy-button"
                      >
                        $199/yr (save 20%)
                      </a>
                    {:else}
                      <a href="/login" class="btn btn-sm btn-neutral mb-2">
                        $20/mo
                      </a>
                      <a href="/login" class="btn btn-sm btn-neutral">
                        $199/yr (save 20%)
                      </a>
                    {/if}
                  </div>
                </th>
              </tr>
            </thead>

            <tbody>
              {#each items as item}
                <tr>
                  <FeatureName {item} />
                  <FeatureSupportBlock item={item.items[0] ?? ''} />
                  <FeatureSupportBlock item={item.items[1] ?? ''} />
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
</div>
