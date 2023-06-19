<script lang="ts">
  import AccordionItem from '../../../../../components/AccordionItem.svelte'
  import Version from '../Version.svelte'
  import Maintenance from './Maintenance.svelte'
  import Rename from './Rename.svelte'
</script>

<AccordionItem title="Danger Zone" header="danger">
  <Rename />
  <Maintenance />
  <Version />
</AccordionItem>
