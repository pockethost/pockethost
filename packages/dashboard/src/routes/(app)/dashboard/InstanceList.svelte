<script lang="ts">
  import { globalInstancesStore, globalInstancesStoreReady } from '$util/stores'
  import {
    DEFAULT_INSTANCE_LIST_PREFS,
    instanceListPrefsHasUrlParams,
    loadInstanceFavoritesFromStorage,
    loadInstanceListPrefsFromStorage,
    loadInstanceListPrefsFromUrl,
    saveInstanceFavorites,
    saveInstanceListPrefs,
    toggleInstanceFavorite,
    type InstanceListSortDirection,
    type InstanceListViewMode,
  } from '$util/instanceListPrefs'
  import { type InstanceFields } from 'pockethost/common'
  import InstanceCard from './InstanceCard.svelte'
  import InstanceTableRow from './InstanceTableRow.svelte'
  import { page } from '$app/state'
  import { browser } from '$app/environment'
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'

  const initialPrefs = instanceListPrefsHasUrlParams(page.url.searchParams)
    ? loadInstanceListPrefsFromUrl(page.url.searchParams)
    : DEFAULT_INSTANCE_LIST_PREFS

  let searchQuery = initialPrefs.searchQuery
  let sortDirection: InstanceListSortDirection = initialPrefs.sortDirection
  let viewMode: InstanceListViewMode = initialPrefs.viewMode
  let favoriteIds: string[] = browser ? loadInstanceFavoritesFromStorage() : []
  let syncReady = instanceListPrefsHasUrlParams(page.url.searchParams)

  onMount(() => {
    if (!syncReady) {
      const stored = loadInstanceListPrefsFromStorage()
      searchQuery = stored.searchQuery
      sortDirection = stored.sortDirection
      viewMode = stored.viewMode
      syncReady = true
    }
  })

  $: validInstanceIds = new Set(Object.keys($globalInstancesStore))

  $: if ($globalInstancesStoreReady && favoriteIds.some((id) => !validInstanceIds.has(id))) {
    favoriteIds = favoriteIds.filter((id) => validInstanceIds.has(id))
    saveInstanceFavorites(favoriteIds)
  }

  const handleToggleFavorite = (id: string) => {
    favoriteIds = toggleInstanceFavorite(favoriteIds, id)
    saveInstanceFavorites(favoriteIds)
  }

  const updateUrl = () => {
    const params = new URLSearchParams()
    if (sortDirection !== DEFAULT_INSTANCE_LIST_PREFS.sortDirection) params.set('sort', sortDirection)
    if (searchQuery) params.set('q', searchQuery)
    if (viewMode !== DEFAULT_INSTANCE_LIST_PREFS.viewMode) params.set('view', viewMode)
    const qs = params.toString()
    goto(qs ? `?${qs}` : '/dashboard', { replaceState: true, keepFocus: true, noScroll: true })
  }

  $: if (syncReady) {
    saveInstanceListPrefs({ searchQuery, sortDirection, viewMode })
    updateUrl()
  }

  const toggleSortDirection = () => {
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'
  }

  const compareInstanceNames = (a: InstanceFields, b: InstanceFields, multiplier: number) =>
    (a.cname || a.subdomain).localeCompare(b.cname || b.subdomain, undefined, { sensitivity: 'base' }) * multiplier

  $: sortMultiplier = sortDirection === 'asc' ? 1 : -1
  $: favoriteSet = new Set(favoriteIds)

  $: filteredInstances = Object.values($globalInstancesStore)
    .filter((instance) => {
      const target = (instance.cname || instance.subdomain).toLowerCase()
      return target.includes(searchQuery.toLowerCase())
    })
    .sort((a, b) => {
      const aFav = favoriteSet.has(a.id)
      const bFav = favoriteSet.has(b.id)
      if (aFav !== bFav) return aFav ? -1 : 1
      return compareInstanceNames(a, b, sortMultiplier)
    })
</script>

<div class="instance-list-toolbar">
  <div class="instance-list-search">
    <wa-icon name="magnifying-glass" class="instance-list-search-icon"></wa-icon>
    <input
      type="search"
      placeholder="Search instances…"
      bind:value={searchQuery}
      class="instance-list-search-input"
      aria-label="Search instances"
    />
  </div>

  <div class="instance-list-toolbar-actions">
    <wa-button
      variant="neutral"
      size="small"
      appearance="outline"
      onclick={toggleSortDirection}
      aria-label="Toggle sort direction"
    >
      <wa-icon name={sortDirection === 'desc' ? 'arrow-down-z-a' : 'arrow-down-a-z'}></wa-icon>
    </wa-button>

    <div class="instance-list-view-toggle" role="group" aria-label="View mode">
      <button
        type="button"
        class="instance-list-view-btn"
        class:instance-list-view-btn--active={viewMode === 'list'}
        aria-pressed={viewMode === 'list'}
        onclick={() => (viewMode = 'list')}
      >
        <wa-icon name="list"></wa-icon>
      </button>
      <button
        type="button"
        class="instance-list-view-btn"
        class:instance-list-view-btn--active={viewMode === 'grid'}
        aria-pressed={viewMode === 'grid'}
        onclick={() => (viewMode = 'grid')}
      >
        <wa-icon name="table-cells"></wa-icon>
      </button>
    </div>
  </div>
</div>

{#if filteredInstances.length === 0}
  <div class="instance-list-empty">
    {#if Object.keys($globalInstancesStore).length === 0}
      <p>No instances yet. Create one to get started.</p>
    {:else}
      <p>No instances match your search.</p>
    {/if}
  </div>
{:else if viewMode === 'list'}
  <div class="instance-table-wrap">
    <table class="instance-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Status</th>
          <th>Version</th>
          <th></th>
          <th>Power</th>
        </tr>
      </thead>
      <tbody>
        {#each filteredInstances as instance (instance.id)}
          <InstanceTableRow
            {instance}
            isFavorite={favoriteIds.includes(instance.id)}
            onToggleFavorite={() => handleToggleFavorite(instance.id)}
          />
        {/each}
      </tbody>
    </table>
  </div>
{:else}
  <div class="instance-grid">
    {#each filteredInstances as instance (instance.id)}
      <InstanceCard
        {instance}
        isFavorite={favoriteIds.includes(instance.id)}
        onToggleFavorite={() => handleToggleFavorite(instance.id)}
      />
    {/each}
  </div>
{/if}

<style>
  .instance-list-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
    margin-top: 0.25rem;
    margin-bottom: 1.25rem;
  }

  .instance-list-search {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1 1 14rem;
    min-width: 0;
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    border: 1px solid rgb(255 255 255 / 0.1);
    transition: border-color 120ms ease;
  }

  .instance-list-search:focus-within {
    border-color: #1eb854;
  }

  .instance-list-search-icon {
    color: rgb(255 255 255 / 0.4);
    flex-shrink: 0;
  }

  .instance-list-search-input {
    width: 100%;
    border: none;
    background: transparent;
    color: #fff;
    font-size: 0.875rem;
    outline: none;
  }

  .instance-list-search-input::placeholder {
    color: rgb(255 255 255 / 0.35);
  }

  .instance-list-toolbar-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    margin-left: auto;
  }

  .instance-list-view-toggle {
    display: inline-flex;
    border: 1px solid rgb(255 255 255 / 0.12);
    border-radius: 0.375rem;
    overflow: hidden;
  }

  .instance-list-view-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: none;
    background: transparent;
    color: rgb(255 255 255 / 0.5);
    cursor: pointer;
  }

  .instance-list-view-btn + .instance-list-view-btn {
    border-left: 1px solid rgb(255 255 255 / 0.12);
  }

  .instance-list-view-btn--active {
    background: rgb(255 255 255 / 0.1);
    color: #fff;
  }

  .instance-list-empty {
    padding: 3rem 1rem;
    text-align: center;
    color: rgb(255 255 255 / 0.45);
    font-size: 0.9375rem;
  }

  .instance-table-wrap {
    overflow-x: auto;
    border: 1px solid rgb(255 255 255 / 0.08);
    border-radius: 0.75rem;
    background: rgb(0 0 0 / 0.25);
  }

  .instance-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  .instance-table th {
    padding: 0.625rem 1rem;
    text-align: left;
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: rgb(255 255 255 / 0.4);
    border-bottom: 1px solid rgb(255 255 255 / 0.08);
    white-space: nowrap;
  }

  .instance-table th:last-child {
    text-align: right;
  }

  .instance-table :global(td) {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid rgb(255 255 255 / 0.06);
    vertical-align: middle;
  }

  .instance-table :global(tr:last-child td) {
    border-bottom: none;
  }

  .instance-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr));
    gap: 0.75rem;
  }
</style>
