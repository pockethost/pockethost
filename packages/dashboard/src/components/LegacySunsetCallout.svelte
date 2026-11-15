<script lang="ts">
  import { page } from '$app/stores'
  import { LEGACY_SUNSET_BLOG, LEGACY_SUNSET_DATE, legacyInstances, summarizeLegacyInstances } from '$lib/legacySunset'
  import { DISCORD_URL } from '$lib/appEnv'
  import { globalInstancesStore } from '$util/stores'

  /**
   * Account-level notice: shown on every logged-in dashboard page while the user owns an instance on PocketBase 0.22 or
   * older. On an affected instance's own page it leads with "This instance", so there is only ever one banner.
   */

  let expanded = false

  $: affected = legacyInstances($globalInstancesStore)
  $: summary = summarizeLegacyInstances(affected, $page.params?.instanceId)
  $: listed = [...(summary.current ? [summary.current] : []), ...summary.named, ...(expanded ? summary.hidden : [])]
  $: moreCount = expanded ? 0 : summary.hidden.length
  $: versionHref = (id: string) => `/instances/${id}/version`
  const linkClass = 'text-primary hover:underline'
</script>

{#if summary.total > 0}
  <wa-callout variant="warning" class="wa-callout-padded wa-callout-subtle-border mb-4" data-testid="legacy-sunset">
    <wa-icon slot="icon" name="triangle-exclamation"></wa-icon>
    <strong>PocketHost is retiring PocketBase 0.22 and older on {LEGACY_SUNSET_DATE}.</strong>
    {#if summary.total === 1 && summary.current}
      This instance runs <code>{summary.current.version}</code>.
      <a href={versionHref(summary.current.id)} class={linkClass}>Upgrade to 0.23 or later</a> before then, because it will
      stop working that day.
    {:else if summary.total === 1}
      {@const only = summary.named[0]!}
      Your instance <a href={versionHref(only.id)} class={linkClass}>{only.subdomain}</a> runs
      <code>{only.version}</code>. Upgrade it to 0.23 or later before then, because it will stop working that day.
    {:else}
      {summary.total} of your instances run 0.22 or older:
      {#each listed as item, i (item.id)}{#if i > 0}{i === listed.length - 1 && moreCount === 0 ? ' and ' : ', '}{/if}<a
          href={versionHref(item.id)}
          class={linkClass}>{item === summary.current ? 'this one' : item.subdomain}</a
        >{item === summary.current
          ? ` (${item.subdomain}, ${item.version})`
          : ` (${item.version})`}{/each}{#if moreCount > 0}{' and '}<button
          type="button"
          class="{linkClass} cursor-pointer"
          on:click={() => (expanded = true)}>{moreCount} more</button
        >{/if}. Upgrade each to 0.23 or later before then, because they will stop working that day.
    {/if}
    If you need help with the upgrade, please reach out on
    <a href={DISCORD_URL} class={linkClass} target="_blank" rel="noopener">Discord</a>. I'm happy to help anyone. We can
    throw some AI at it.
    <a href={LEGACY_SUNSET_BLOG} class={linkClass}>Details</a>
  </wa-callout>
{/if}
