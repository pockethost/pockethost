<script lang="ts">
  import { userStore } from '$util/stores'
  import { loadLoyaltyStatus } from '$util/loyalty'
  import type { LoyaltyProgress } from '@pockethost/server/common'

  /** "You are N days away from earning your first/next bonus instance." Hidden when nothing is being earned. */

  let progress: LoyaltyProgress | null = null
  let loadedFor = ''

  $: key = $userStore?.id ? `${$userStore.id}:${$userStore.subscription_quantity ?? 0}` : ''
  $: if (key && key !== loadedFor) {
    loadedFor = key
    loadLoyaltyStatus($userStore?.subscription_quantity ?? 0).then((s) => (progress = s?.progress ?? null))
  }
</script>

{#if progress}
  <div class="loyalty-nudge">
    <wa-icon name="gift"></wa-icon>
    <span>
      You are <strong>{progress.days} day{progress.days === 1 ? '' : 's'}</strong> away from earning your
      {progress.first ? 'first' : 'next'} bonus instance. Keep going!
      <a href="/blog/loyalty-bonus-instances">More info</a>
    </span>
  </div>
{/if}

<style>
  .loyalty-nudge {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin: -0.75rem 0 1.5rem;
    padding: 0.7rem 1rem;
    border: 1px solid rgb(30 184 84 / 0.35);
    border-radius: 0.75rem;
    background: rgb(30 184 84 / 0.08);
    font-size: 0.9rem;
    color: rgb(255 255 255 / 0.85);
  }

  .loyalty-nudge wa-icon {
    flex-shrink: 0;
    color: rgb(30 184 84);
  }

  .loyalty-nudge a {
    color: rgb(30 184 84);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
</style>
