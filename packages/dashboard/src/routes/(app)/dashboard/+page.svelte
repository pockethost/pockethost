<script lang="ts">
  import { MAX_INSTANCE_COUNTS } from '$src/env'
  import { globalInstancesStore, userSubscriptionType } from '$util/stores'
  import { values } from '@s-libs/micro-dash'
  import Main from './Main.svelte'

  $: maxInstanceCount = MAX_INSTANCE_COUNTS[$userSubscriptionType]
  $: instanceCount = values($globalInstancesStore).length
</script>

<Main />
