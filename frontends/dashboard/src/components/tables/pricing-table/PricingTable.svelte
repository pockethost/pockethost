<script lang="ts">
  import { PLAN_NAMES, SubscriptionType } from '$shared'
  import { isUserLegacy, userSubscriptionType } from '$util/stores'
  import FeatureName from '$components/tables/pricing-table/FeatureName.svelte'
  import FeatureSupportBlock from '$components/tables/pricing-table/FeatureSupportBlock.svelte'
  import MediaQuery from '$components/MediaQuery.svelte'
  import MobileTable from '$components/tables/pricing-table/MobileTable.svelte'

  type ItemValue = "1" | "Unlimited" | "YesBlock" | "NoBlock";

  interface Item {
    name: string;
    items: ItemValue[];
  }

  const items: Item[] = [
    {name: "Number of Projects", items: ["1", "Unlimited", "Unlimited"]},
    {name: "Unlimited Bandwidth*", items: ["YesBlock", "YesBlock", "YesBlock"]},
    {name: "Unlimited Storage*", items: ["YesBlock", "YesBlock", "YesBlock"]},
    {name: "Unlimited CPU*", items: ["YesBlock", "YesBlock", "YesBlock"]},
    {name: "FTP access", items: ["YesBlock", "YesBlock", "YesBlock"]},
    {name: "Run every version of PocketBase", items: ["YesBlock", "YesBlock", "YesBlock"]},
    {name: "Community Discord", items: ["YesBlock", "YesBlock", "YesBlock"]},
    {name: "Priority Discord", items: ["NoBlock", "YesBlock", "YesBlock"]},
    {name: "Founder's Discord", items: ["NoBlock", "NoBlock", "YesBlock"]},
    {name: "Founders mug/tee", items: ["NoBlock", "NoBlock", "YesBlock"]},
  ]
</script>



<div class="relative lg:pt-14">
  <div class="mx-auto px-6 py-24 sm:py-32 lg:px-8">

    <MediaQuery query="(min-width: 1024px)" let:matches>
      {#if matches}

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
                    <th scope="col">
                      <span class="sr-only">Starter tier</span>
                    </th>
                    <th scope="col">
                      <span class="sr-only">Scale tier</span>
                    </th>
                    <th scope="col">
                      <span class="sr-only">{PLAN_NAMES[SubscriptionType.Lifetime]} tier</span>
                    </th>
                  </tr>
                  </thead>

                  <tbody>
                  {#each items as item}
                    <tr>
                      <FeatureName>{item.name}</FeatureName>
                      <FeatureSupportBlock item={item.items[0] ?? ""} />
                      <FeatureSupportBlock item={item.items[1] ?? ""} />
                      <FeatureSupportBlock item={item.items[2] ?? ""} />
                    </tr>
                  {/each}
                  </tbody>
                </table>

                <!-- Fake card borders -->
                <div class="pointer-events-none absolute inset-x-8 inset-y-0 grid grid-cols-4 gap-x-8 before:block" aria-hidden="true">
                  {#if $userSubscriptionType === SubscriptionType.Legacy || $userSubscriptionType === SubscriptionType.Free}
                    <div class="rounded-lg ring-2 ring-primary"></div>
                  {:else}
                    <div class="rounded-lg ring-1 ring-transparent"></div>
                  {/if}

                  {#if $userSubscriptionType === SubscriptionType.Premium}
                    <div class="rounded-lg ring-2 ring-primary"></div>
                  {:else}
                    <div class="rounded-lg ring-1 ring-transparent"></div>
                  {/if}

                  {#if $userSubscriptionType === SubscriptionType.Lifetime}
                    <div class="rounded-lg ring-2 ring-primary"></div>
                  {:else}
                    <div class="rounded-lg ring-1 ring-transparent"></div>
                  {/if}
                </div>
              </div>
            </div>
          </div>
        </section>

      {:else}

        <section aria-labelledby="mobile-comparison-heading">
          <h2 id="mobile-comparison-heading" class="sr-only">Feature comparison</h2>

          <div class="mx-auto max-w-2xl space-y-16">
            <div>
              <div class="-mt-px pt-10">
                <h3 class="text-sm font-semibold leading-6 text-primary">Free</h3>
                <p class="mt-1 text-sm leading-6 ">Free forever. Use PocketHost for your next project and enjoy all the same features the paid tiers get.</p>
              </div>

              <div class="mt-10 space-y-10">
                <div>
                  <h4 class="text-sm font-semibold leading-6">Catered for business</h4>
                  <div class="relative mt-6">
                    <!-- Fake card background -->
                    <div aria-hidden="true" class="absolute inset-y-0 right-0 hidden w-1/2 rounded-lg bg-gray-800 shadow-sm sm:block"></div>

                    <div class={`relative rounded-lg bg-white shadow-sm sm:rounded-none sm:bg-transparent sm:shadow-none sm:ring-0`}>
                      <dl class="divide-y divide-gray-200 text-sm leading-6">
                        {#each items as item}
                          <MobileTable feature={item.name} item={item.items[0]} />
                        {/each}
                      </dl>
                    </div>

                    <!-- Fake card border -->
                    {#if $userSubscriptionType === SubscriptionType.Legacy || $userSubscriptionType === SubscriptionType.Free}
                      <div aria-hidden="true" class="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 rounded-lg sm:block ring-2 ring-primary"></div>
                    {:else}
                      <div aria-hidden="true" class="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 rounded-lg sm:block ring-1 ring-gray-700"></div>
                    {/if}
                  </div>
                </div>
              </div>
            </div>

            <div class="border-t border-gray-900/10">
              <div class="-mt-px pt-10">
                <h3 class="text-sm font-semibold leading-6 text-primary">{PLAN_NAMES[SubscriptionType.Premium]}</h3>
                <p class="mt-1 text-sm leading-6 ">Want all your PocketHost projects in one place? That's what the Pro tier is all about.</p>
              </div>

              <div class="mt-10 space-y-10">
                <div>
                  <h4 class="text-sm font-semibold leading-6">Catered for business</h4>
                  <div class="relative mt-6">
                    <!-- Fake card background -->
                    <div aria-hidden="true" class="absolute inset-y-0 right-0 hidden w-1/2 rounded-lg bg-gray-800 shadow-sm sm:block"></div>

                    <div class={`relative rounded-lg bg-gray-800 shadow-sm sm:rounded-none sm:bg-transparent sm:shadow-none sm:ring-0`}>
                      <dl class="divide-y divide-gray-200 text-sm leading-6">
                        {#each items as item}
                          <MobileTable feature={item.name} item={item.items[1]} />
                        {/each}
                      </dl>
                    </div>

                    <!-- Fake card border -->
                    {#if $userSubscriptionType === SubscriptionType.Premium}
                      <div aria-hidden="true" class="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 rounded-lg sm:block ring-2 ring-primary"></div>
                    {:else}
                      <div aria-hidden="true" class="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 rounded-lg sm:block ring-1 ring-gray-700"></div>
                    {/if}
                  </div>
                </div>
              </div>
            </div>

            <div class="border-t border-gray-900/10">
              <div class="-mt-px pt-10">
                <h3 class="text-sm font-semibold leading-6 text-primary">{PLAN_NAMES[SubscriptionType.Lifetime]}</h3>
                <p class="mt-1 text-sm leading-6 ">Super elite! The Founder's Edition is our way of saying thanks for supporting PocketHost in these early days. Choose between lifetime and annual options.</p>
              </div>

              <div class="mt-10 space-y-10">
                <div>
                  <h4 class="text-sm font-semibold leading-6">Catered for business</h4>
                  <div class="relative mt-6">
                    <!-- Fake card background -->
                    <div aria-hidden="true" class="absolute inset-y-0 right-0 hidden w-1/2 rounded-lg bg-gray-800 shadow-sm sm:block"></div>

                    <div class={`relative rounded-lg bg-gray-800 shadow-sm sm:rounded-none sm:bg-transparent sm:shadow-none sm:ring-0`}>
                      <dl class="divide-y divide-gray-200 text-sm leading-6">
                        {#each items as item}
                          <MobileTable feature={item.name} item={item.items[2]} />
                        {/each}
                      </dl>
                    </div>

                    <!-- Fake card border -->
                    {#if $userSubscriptionType === SubscriptionType.Lifetime}
                      <div aria-hidden="true" class="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 rounded-lg sm:block ring-2 ring-primary"></div>
                    {:else}
                      <div aria-hidden="true" class="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 rounded-lg sm:block ring-1 ring-gray-700"></div>
                    {/if}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

      {/if}
    </MediaQuery>
  </div>
</div>