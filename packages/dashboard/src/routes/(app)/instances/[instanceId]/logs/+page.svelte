<script lang="ts">
  import { assertExists } from 'pockethost/common'
  import FeatureTab from '$components/FeatureTab.svelte'
  import { instance } from '../store'
  import LoggingInner from './LoggingInner.svelte'

  assertExists($instance, `Expected instance here`)
  const { subdomain } = $instance
</script>

<svelte:head>
  <title>{subdomain} logging - PocketHost</title>
</svelte:head>

<FeatureTab title="Logs" documentation="/docs/logs">
  <svelte:fragment slot="summary">
    <p>
      Instance logs appear here in realtime, including <code>console.log</code> from JavaScript hooks.
    </p>
  </svelte:fragment>

  <LoggingInner />
</FeatureTab>
