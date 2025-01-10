<script lang="ts">
  import PricingTable from './PricingTable.svelte'
  import FounderCard from '$components/FounderCard.svelte'
  import FlounderCard from '$components/FlounderCard.svelte'
  import Testimonials from '$components/Testimonials.svelte'
</script>

<!-- Flex them up -->
<div class="flex flex-col mt-2">
  <div class="flex-1 text-center font-bold text-primary text-4xl mb-6">
    Pricing
  </div>

  <div class="flex-1 bg-neutral text-neutral-content p-5 flex flex-col">
    <div class="text-xl text-center pb-5">Rare deals</div>
    <div class="flex flex-wrap gap-6 justify-center">
      <div class="w-96">
        <FounderCard />
      </div>

      <div class="w-96">
        <FlounderCard endDate={new Date(2024, 11, 3)} />
      </div>
    </div>
  </div>

  <PricingTable />
  <Testimonials />
</div>
