<script lang="ts">
  import Version from './Version.svelte'
  import Maintenance from './Maintenance.svelte'
  import Rename from './Rename.svelte'
</script>



<div class='card card-body bg-base-200 block'>
  <h3 class='text-xl font-bold mb-4'>Danger Zone</h3>

  <Rename />

  <Maintenance />

  <Version />
</div>