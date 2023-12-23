<script lang="ts">
  import { isBoolean, isNumber, isString } from '@s-libs/micro-dash'

  type Plan = {
    name: string
    price: string
    featuresIncluded: (boolean | number | string)[] // Array of booleans indicating feature inclusion
  }

  const featureNames: string[] = [
    '# Projects',
    'Unlimited Bandwidth*',
    'Unlimited Storage*',
    'Unlimited CPU*',
    `FTP access`,
    `Run every version of PocketBase`,
    `Community Discord`,
    `Priority Discord`,
    `Founder's Discord`,
    `Founders mug/tee`,
  ] // Centralized feature list

  const plans: Plan[] = [
    {
      name: 'Legacy',
      price: `<span class="text-success">Free Forever</span>`,
      featuresIncluded: [
        `However many you have right now`,
        true,
        true,
        true,
        true,
        true,
        true,
        false,
        false,
        false,
      ], // Corresponds to featureNames
    },
    {
      name: 'Hacker',
      price: `<span class="text-success">Free Forever</span>`,
      featuresIncluded: [
        `1`,
        true,
        true,
        true,
        true,
        true,
        true,
        false,
        false,
        false,
      ], // Corresponds to featureNames
    },
    {
      name: 'Pro Monthly',
      price: `<span class="text-info">$20/mo</span>`,
      featuresIncluded: [
        `Unlimited`,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        false,
        false,
      ], // Corresponds to featureNames
    },
    {
      name: 'Pro Annual',
      price: `<span class="text-info">$199/yr</span>`,
      featuresIncluded: [
        `Unlimited`,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        false,
        false,
      ], // Corresponds to featureNames
    },
    {
      name: 'Founder Annual',
      price: `<span class="text-info">$99/yr (50% savings)</span>`,
      featuresIncluded: [
        `Unlimited`,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
      ], // Corresponds to featureNames
    },

    {
      name: 'Founder Lifetime',
      price: `<span class="text-accent">$299 once</span>`,
      featuresIncluded: [
        `Unlimited`,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
      ], // Corresponds to featureNames
    },
  ]
</script>

<div class="container mx-auto p-4">
  <table class="table table-lg">
    <thead>
      <tr>
        <th></th>
        {#each plans as plan}
          <th>
            <div class="text-xl">{plan.name}</div>
            <div class="text-xl">{@html plan.price}</div>
            <button class="btn btn-primary">Choose Plan</button>
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each featureNames as feature, i}
        <tr class="hover">
          <td>{feature}</td>
          {#each plans as plan}
            <td>
              {#if isString(plan.featuresIncluded[i])}
                {plan.featuresIncluded[i]}
              {:else if isNumber(plan.featuresIncluded[i])}
                {#if plan.featuresIncluded[i] === true}
                  <i class="fa-solid fa-infinity"></i>
                {:else}
                  {plan.featuresIncluded[i]}
                {/if}
              {:else if isBoolean(plan.featuresIncluded[i])}
                {#if plan.featuresIncluded[i]}
                  <i class="text-success fa-solid fa-check"></i>
                {:else}
                  <i class="text-error fa-solid fa-x"></i>
                {/if}
              {/if}
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>
