<script lang="ts">
  import { LEGACY_SUNSET_BLOG, LEGACY_SUNSET_DATE } from '$lib/legacySunset'
  import { userSubscriptionType } from '$util/stores'
  import { SubscriptionType } from '@pockethost/server/common'

  export let version: string
  export let instanceId: string

  $: isPaid = [SubscriptionType.Founder, SubscriptionType.Flounder, SubscriptionType.Premium].includes(
    $userSubscriptionType
  )
</script>

<wa-callout variant="warning" class="wa-callout-padded wa-callout-subtle-border mb-4">
  <wa-icon slot="icon" name="triangle-exclamation"></wa-icon>
  <strong>PocketHost is retiring PocketBase 0.22 and older on {LEGACY_SUNSET_DATE}.</strong> This instance runs
  <code>{version}</code>. <a href={`/instances/${instanceId}/version`} class="link">Upgrade to 0.23 or later</a> before
  then, or it will be suspended and archived.
  {#if isPaid}
    As a paid customer you can get help with the upgrade: reply to the sunset email or
    <a href="/support" class="link">contact support</a>.
  {/if}
  <a href={LEGACY_SUNSET_BLOG} class="link">Details</a>
</wa-callout>
