<script lang="ts">
  import MiniToggle from '$components/MiniToggle.svelte'
  import { client } from '$src/pocketbase'
  import AccordionItem from '../../../../components/AccordionItem.svelte'
  import MiniEdit from '../../../../components/MiniEdit.svelte'
  import Version from './Version.svelte'
  import { instance } from './store'

  const { renameInstance, setInstanceMaintenance } = client()

  $: ({ subdomain, id, maintenance } = $instance)

  const onRename = (subdomain: string) =>
    renameInstance({ instanceId: id, subdomain }).then(() => 'saved')

  const onMaintenance = (maintenance: boolean) =>
    setInstanceMaintenance({ instanceId: id, maintenance }).then(() => 'saved')
</script>

<AccordionItem title="Danger Zone" header="danger">
  <div>
    <h3>Rename Instance</h3>
    <p class="text-danger">
      Warning - renaming your instance will cause it to become inaccessible by the old instance
      name. You also may not be able to change it back if someone else choose it. See <a
        href="https://pockethost.gitbook.com/manual/usage/rename-instnace.md">renaming</a
      > for more information.
    </p>
    <MiniEdit value={subdomain} save={onRename} />
  </div>
  <div>
    <h3>Maintenance Mode</h3>
    <p class="text-danger">
      Your PocketHost instance will not be accessible while in maintenance mode. Use this when you
      are upgrading, downgrading, or backing up your data. See <a
        href="https://pockethost.gitbook.com/manual/usage/maintenance.md">Maintenance Mode</a
      > for more information.
    </p>
    <MiniToggle value={maintenance} save={onMaintenance}>Maintenance Mode</MiniToggle>
  </div>
  <Version />
</AccordionItem>
