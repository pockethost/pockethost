<script lang="ts">
  import { client } from '$src/pocketbase'
  import MiniEdit from '../../../../../components/MiniEdit.svelte'
  import { instance } from '../store'

  const { renameInstance, setInstanceMaintenance } = client()

  $: ({ subdomain, id, maintenance } = $instance)

  const onRename = (subdomain: string) =>
    renameInstance({ instanceId: id, subdomain }).then(() => 'saved')
</script>

<div>
  <h3>Rename Instance</h3>
  <p class="text-danger">
    Warning - renaming your instance will cause it to become inaccessible by the old instance name.
    You also may not be able to change it back if someone else choose it. See <a
      href="https://pockethost.gitbook.io/manual/daily-usage/rename-instance">renaming</a
    > for more information.
  </p>
  <MiniEdit value={subdomain} save={onRename} />
</div>
