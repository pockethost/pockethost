<script lang="ts">
  import FounderCard from '$components/FounderCard.svelte'
  import FlounderCard from '$components/FlounderCard.svelte'
</script>

<div class="flex-1 p-5 flex flex-col">
  <div class="text-3xl text-center pb-5">Rare deals</div>
  <div class="flex flex-wrap gap-6 justify-center">
    <FounderCard />

    <FlounderCard />
  </div>
</div>
