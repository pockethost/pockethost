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
      name: 'Premium Bandwidth',
      items: ['10GB', '100GB'],
      info: `Premium Bandwidth is pooled per account and refreshes monthly. Any data data transferred in or out of any PocketHost instance you own counts against this pool. This includes all HTTP traffic, file downloads, and admin panel usage.`,
    },
    {
      name: 'Standard Bandwidth',
      items: ['Unlimited', 'Unlimited'],
      info: `Standard Bandwidth may be slower than Premium. It is provided so your app doesn't just stop working when you exceed your Premium quota.`,
    },
    {
      name: 'Storage',
      items: ['1GB', '10GB'],
      info: `Database Storage is pooled per account. This is anything file you are storing, including uplaoded user files and database backups. S3 storage is recommended for user file uploads and database backups so you don't run out of room for essential data.`,
    },
    {
      name: 'Max local inodes',
      items: ['1k', '100k'],
      info: `An inode is typically a file or directory on disk. This limit is pooled per account. The inode limit counts toward any file you or your users upload. S3 storage is recommended for user file uploads and database backups so you don't run out of inodes for essential data.`,
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

<div class="flex justify-center items-center flex-col space-y-10">
  <div class="text-xl text-center">
    Feature comparison
    <div class="text-neutral-content text-sm p-2">
      Learn more about our <a href="/docs/pricing-ethos" class="link"
        >pricing ethos</a
      >
      and <a href="/terms" class="link">Fair Use</a>.
    </div>
  </div>

  <table class="border-separate border-spacing-x-8 max-w-md">
    <thead>
      <tr class="text-left">
        <th class="min-w-48"> </th>
        <th class="text-center min-w-48">
          {PLAN_NAMES[SubscriptionType.Free]}
        </th>
        <th class="text-center min-w-48">
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
                href="https://store.pockethost.io/checkout/buy/8e7cfb35-846a-4fd6-adcb-c2db5589275d?checkout[custom][user_id]={$userStore?.id}&checkout[email]={$userStore?.email}"
                class="btn btn-sm btn-neutral lemonsqueezy-button mb-2"
              >
                $20/mo
              </a>
              <a
                href="https://store.pockethost.io/checkout/buy/96e4ab4b-f646-4fb2-b830-5584db983e73?checkout[custom][user_id]={$userStore?.id}&checkout[email]={$userStore?.email}"
                class="btn btn-sm btn-neutral lemonsqueezy-button"
              >
                $199/yr (save 20%)
              </a>
            {:else}
              <a href="/login" class="btn btn-sm btn-neutral mb-2"> $20/mo </a>
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
