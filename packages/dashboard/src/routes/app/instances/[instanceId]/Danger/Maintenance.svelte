<script lang="ts">
  import MiniToggle from '$components/MiniToggle.svelte'
  import { client } from '$src/pocketbase'
  import { instance } from '../store'

  const { setInstanceMaintenance } = client()

  $: ({ id, maintenance } = $instance)

  const onMaintenance = (maintenance: boolean) =>
    setInstanceMaintenance({ instanceId: id, maintenance }).then(() => 'saved')
</script>

<div>
  <h3>Maintenance Mode</h3>
  <p class="text-danger">
    Your PocketHost instance will not be accessible while in maintenance mode. Use this when you are
    upgrading, downgrading, or backing up your data. See <a
      href="https://pockethost.gitbook.io/manual/daily-usage/maintenance">Maintenance Mode</a
    > for more information.
  </p>
  <MiniToggle value={maintenance} save={onMaintenance}>Maintenance Mode</MiniToggle>
</div>
