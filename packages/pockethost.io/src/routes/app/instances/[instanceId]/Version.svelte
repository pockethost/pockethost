<script lang="ts">
  import { client } from '$src/pocketbase'
  import MiniEdit from '../../../../components/MiniEdit.svelte'
  import { instance } from './store'

  $: ({ id, maintenance } = $instance)

  let _version = $instance.version

  const saveEdit = async (newValue: string) =>
    client()
      .saveVersion({ instanceId: id, version: newValue })
      .then(() => {
        _version = newValue
        return 'saved'
      })
</script>

<div>
  <h3>Version Lock</h3>
  <p class="text-danger">
    Warning - changing your version number should only be done when the instance is in maintenance
    mode and you have already done a fresh backup. Depending on the upgrade/downgrade you are
    performing, your instance may become inoperable. If that happens, you may need to manually
    upgrade your database locally. See <a
      href="https://pockethost.gitbook.io/manual/daily-usage/upgrading">upgrading</a
    > for more information. name.
  </p>
  Version <MiniEdit value={_version} save={saveEdit} disabled={!maintenance} />
</div>
