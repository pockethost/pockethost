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
      price: [
        {
          text: '$5-25 monthly',
          link: `https://store.pockethost.io/buy/d4b2d062-429c-49b4-9cdc-853aaeb17e20?checkout[custom][user_id]=${$userStore?.id}&checkout[email]=${$userStore?.email}`,
        },
      ],
    },
  ]

  const items: Item[] = [
    {
      name: 'Number of Instances',
      items: ['$5/instance (up to 4) or $25 for unlimited'],
      info: `Each instance can have its own domain, database, and files.`,
    },
    {
      name: 'Premium Bandwidth',
      items: ['Unlimited fair use'],
    },

    {
      name: 'Storage',
      items: ['Unlimited fair use'],
    },
    {
      name: 'CPU',
      items: ['Unlimited fair use'],
    },
    {
      name: 'FTP access',
      items: ['YesBlock'],
    },
    {
      name: 'Run every version of PocketBase',
      items: ['YesBlock'],
      info: `We support the latest patch of every minor release of PocketBase.`,
    },
    {
      name: 'Secure infrastructure',
      items: ['YesBlock'],
    },

    {
      name: 'Community Discord',
      items: ['YesBlock'],
    },
    {
      name: 'Custom Domains',
      items: ['YesBlock'],
    },
    { name: 'Pro Discord', items: ['YesBlock'] },
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
  <div class="text-2xl text-center">Features</div>

  <table class="hidden md:table border-spacing-x-8 max-w-[354px] md:max-w-md">
    <thead class="table-header-group">
      <tr class="">
        <th class=""></th>
        {#each plans as plan}
          <th>
            <div class="flex flex-col justify-center py-4">
              {#each plan.price as pPrice}
                <a
                  href={$userStore && $isUserVerified ? pPrice.link : `/login`}
                  class="btn btn-sm btn-secondary text-base mb-2"
                >
                  {pPrice.text}
                </a>
              {/each}
            </div>
          </th>
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
          <th>
            <div class="flex flex-col justify-center py-4">
              {#each plan.price as pPrice}
                <a
                  href={$userStore && $isUserVerified ? pPrice.link : `/login`}
                  class="btn btn-xs w-40 btn-primary mb-2"
                >
                  {pPrice.text}
                </a>
              {/each}
            </div>
          </th>
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
