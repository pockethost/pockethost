<script lang="ts">
  import { regionOfEdge } from '$util/regions'

  interface Props {
    /** The instance's edge record id (`instance.edge`) */
    edge: string | undefined
    /** Show only the flag (name in the tooltip) */
    compact?: boolean
  }

  let { edge, compact = false }: Props = $props()

  /** ISO 3166-1 alpha-2 code -> flag emoji (two regional indicator symbols) */
  const flagOf = (country: string) =>
    /^[A-Z]{2}$/.test(country) ? String.fromCodePoint(...[...country].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : '🌐'

  let region = $derived(regionOfEdge(edge))
  let label = $derived($region ? $region.name || $region.id : '')
  let title = $derived($region ? `Runs in ${label}${$region.country ? `, ${$region.country}` : ''}` : '')
</script>

{#if $region}
  <span
    class="inline-flex items-center h-6 px-2 rounded-full text-xs font-medium leading-none text-white/60 border border-white/10 bg-white/5 gap-1.5 shrink-0"
    {title}
  >
    <span class="text-sm leading-none" aria-hidden="true">{flagOf($region.country)}</span>
    {#if compact}
      <span class="sr-only">{label}</span>
    {:else}
      {label}
    {/if}
  </span>
{/if}
