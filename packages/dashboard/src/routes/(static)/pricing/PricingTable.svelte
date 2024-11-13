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

  const plans = [
    {
      name: PLAN_NAMES[SubscriptionType.Free],
      price: null,
    },
    {
      name: PLAN_NAMES[SubscriptionType.Premium],
      price: [
        {
          text: '$20/mo',
          link: `https://store.pockethost.io/checkout/buy/8e7cfb35-846a-4fd6-adcb-c2db5589275d?checkout[custom][user_id]=${$userStore?.id}&checkout[email]=${$userStore?.email}`,
        },
        {
          text: '$199/yr (save 20%)',
          link: `https://store.pockethost.io/checkout/buy/96e4ab4b-f646-4fb2-b830-5584db983e73?checkout[custom][user_id]=${$userStore?.id}&checkout[email]=${$userStore?.email}`,
        },
      ],
    },
  ]

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
      items: [
        '10GB',
        '<div class="flex flex-col"><div>100GB</div><div class="text-xs text-neutral-content">$5 per 100GB thereafter</div></div>',
      ],
      info: `Storage is pooled per account. The first 100GB is included. After that, you are billed $5 for each subsequent 100GB block or partial block of 100GB used.`,
    },
    {
      name: 'Max inodes',
      items: ['1k', '100k'],
      info: `inodes are pooled per account. An inode is typically a file or directory. The inode limit counts toward any file you or your users upload.`,
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
      info: `We support the latest patch of every minor release of PocketBase.`,
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

<div class="bg-info text-info-content p-4 text-center text-lg">
  Learn more about our <a href="/docs/pricing-ethos" class="link"
    >pricing ethos</a
  >
  and <a href="/terms" class="link">Fair Use</a>.
</div>

<div
  class="flex justify-center items-center flex-col space-y-10 p-10 bg-emerald-950"
>
  <div class="text-2xl text-center">Feature comparison</div>

  <table class="hidden md:table border-spacing-x-8 max-w-[354px] md:max-w-md">
    <thead class="table-header-group">
      <tr class=" text-left">
        <th class=" md:min-w-48"> </th>
        {#each plans as plan}
          <th class="text-center text-lg min-w-48">
            {plan.name}
          </th>
        {/each}
      </tr>
      <tr class="">
        <th class=""></th>
        {#each plans as plan}
          {#if !plan.price}
            <th class="text-center">Free Forever</th>
          {:else}
            <th>
              <div class="flex flex-col justify-center py-4">
                {#each plan.price as pPrice}
                  <a
                    href={$userStore && $isUserVerified
                      ? pPrice.link
                      : `/login`}
                    class="btn btn-sm btn-secondary text-base mb-2"
                  >
                    {pPrice.text}
                  </a>
                {/each}
              </div>
            </th>
          {/if}
        {/each}
      </tr>
    </thead>

    <tbody>
      {#each items as item}
        <tr class="table-row text-base border-b border-gray-700">
          <FeatureName {item} enlarge />
          {#each item.items as itemVal, idx}
            <FeatureSupportBlock item={itemVal ?? ''} />
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>

  <table class="md:hidden border-spacing-x-8 max-w-[354px] md:max-w-md">
    <thead class="table-header-group">
      {#each plans as plan}
        <tr class="text-left">
          <th class=" text-lg min-w-48">
            {plan.name}
          </th>
          {#if !plan.price}
            <th>Free Forever</th>
          {:else}
            <th>
              <div class="flex flex-col justify-center py-4">
                {#each plan.price as pPrice}
                  <a
                    href={$userStore && $isUserVerified
                      ? pPrice.link
                      : `/login`}
                    class="btn btn-xs w-40 btn-primary mb-2"
                  >
                    {pPrice.text}
                  </a>
                {/each}
              </div>
            </th>
          {/if}
        </tr>
      {/each}
    </thead>

    <tbody>
      {#each items as item}
        <tr class="table-row text-base border-b border-gray-700 col-span-2">
          <FeatureName {item} enlarge />
        </tr>
        {#each item.items as itemVal, idx}
          <tr class="table-row border-b even:border-0 border-gray-800">
            <td class="text-left">
              {plans[idx]?.name}
            </td>
            <FeatureSupportBlock item={itemVal ?? ''} />
          </tr>
        {/each}
      {/each}
    </tbody>
  </table>
</div>
