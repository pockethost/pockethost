<script lang="ts">
  import FeatureName from '$components/tables/pricing-table/FeatureName.svelte'
  import FeatureSupportBlock from '$components/tables/pricing-table/FeatureSupportBlock.svelte'
  import { PLAN_NAMES, SubscriptionType } from 'pockethost/common'

  interface Item {
    name: string
    items: string[]
    isNew?: boolean
    info?: string
  }

  const items: Item[] = [
    {
      name: 'Cost',
      items: ['Free Forever', '$20/mo<br/>$199/yr (save 20%)'],
    },
    {
      name: 'Number of Projects',
      items: ['25', '250'],
      info: `A project is a PocketHost instance. Each project can have its own domain, database, and files.`,
    },
    {
      name: 'Egress bandwidth (per month, per project)',
      items: ['1GB', '100GB'],
      info: `Egress bandwidth means all data transferred out of your PocketHost instance. This includes all HTTP responses, database query results, and file downloads.`,
    },
    {
      name: 'Ingress bandwidth (per month, per project)',
      items: ['1GB', '100GB'],
      info: `Ingress bandwidth means all data transferred into your PocketHost instance. This includes all HTTP requests, database writes, and file uploads.`,
    },
    {
      name: 'Local Storage (per project)',
      items: ['1GB', '10GB'],
      info: `Local storage means storage on the PocketBase disk volume. S3 storage is recommended for large files and does not count toward the local storage limit.`,
    },
    {
      name: 'Max local inodes (per project)',
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
    { name: 'Priority Discord', items: ['NoBlock', 'YesBlock'] },
  ]
</script>

<div class="relative lg:pt-14">
  <div class="mx-auto px-6 py-24 sm:py-32 lg:px-8">
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
              </thead>

              <tbody>
                {#each items as item}
                  <tr>
                    <FeatureName
                      >{item.name}
                      {#if item.isNew}
                        <span class="badge badge-primary">new</span>
                      {/if}

                      {#if item.info}
                        <div class="text-neutral-content text-xs">
                          {item.info}
                        </div>
                      {/if}
                    </FeatureName>
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
</div>
