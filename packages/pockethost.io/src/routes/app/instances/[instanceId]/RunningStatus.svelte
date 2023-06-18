<script lang="ts">
  import { client } from '$src/pocketbase'
  import type { InstanceFields } from '@pockethost/common'
  import MiniEdit from './MiniEdit.svelte'

  export let instance: InstanceFields

  const { version } = instance

  let _version = version

  const saveEdit = async (newValue: string) =>
    client()
      .saveVersion({ instanceId: instance.id, version: newValue })
      .then(() => {
        _version = newValue
        return 'saved'
      })
</script>

<div>
  Version <MiniEdit value={_version} save={saveEdit} />
</div>
