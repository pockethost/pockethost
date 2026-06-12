<script lang="ts">
  import CardHeader from '$components/cards/CardHeader.svelte'
  import { assertExists } from 'pockethost/common'
  import { instance } from '../store'
  import Inner from './Inner.svelte'

  assertExists($instance)
</script>

<CardHeader documentation="/docs/access">Access</CardHeader>

<Inner />
