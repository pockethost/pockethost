export type InstanceListSortOptions = 'subdomain' | 'created' | 'power'
export type InstanceListSortDirection = 'asc' | 'desc'
export type InstanceListFilterPower = 'all' | 'on' | 'off'

export type InstanceListPrefs = {
  sortBy: InstanceListSortOptions
  sortDirection: InstanceListSortDirection
  filterPower: InstanceListFilterPower
  searchQuery: string
}

export const DEFAULT_INSTANCE_LIST_PREFS: InstanceListPrefs = {
  sortBy: 'power',
  sortDirection: 'asc',
  filterPower: 'all',
  searchQuery: '',
}

const STORAGE_KEY = 'ph.dashboard.instanceList'

const DEFAULTS = DEFAULT_INSTANCE_LIST_PREFS

const SORT_OPTIONS = new Set<InstanceListSortOptions>(['subdomain', 'created', 'power'])
const SORT_DIRECTIONS = new Set<InstanceListSortDirection>(['asc', 'desc'])
const FILTER_POWER = new Set<InstanceListFilterPower>(['all', 'on', 'off'])

const URL_KEYS = ['sort', 'by', 'f', 'q'] as const

export const instanceListPrefsHasUrlParams = (searchParams: URLSearchParams) =>
  URL_KEYS.some((key) => searchParams.has(key))

const parseStored = (raw: string | null): Partial<InstanceListPrefs> | null => {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<InstanceListPrefs>
    return typeof parsed === 'object' && parsed !== null ? parsed : null
  } catch {
    return null
  }
}

const sanitize = (stored: Partial<InstanceListPrefs>): InstanceListPrefs => ({
  sortBy: stored.sortBy && SORT_OPTIONS.has(stored.sortBy) ? stored.sortBy : DEFAULTS.sortBy,
  sortDirection:
    stored.sortDirection && SORT_DIRECTIONS.has(stored.sortDirection) ? stored.sortDirection : DEFAULTS.sortDirection,
  filterPower: stored.filterPower && FILTER_POWER.has(stored.filterPower) ? stored.filterPower : DEFAULTS.filterPower,
  searchQuery: typeof stored.searchQuery === 'string' ? stored.searchQuery : DEFAULTS.searchQuery,
})

export const loadInstanceListPrefsFromUrl = (searchParams: URLSearchParams): InstanceListPrefs => {
  const fromUrl: Partial<InstanceListPrefs> = {}
  const sort = searchParams.get('sort')
  const by = searchParams.get('by')
  const f = searchParams.get('f')
  const q = searchParams.get('q')

  if (sort && SORT_DIRECTIONS.has(sort as InstanceListSortDirection)) {
    fromUrl.sortDirection = sort as InstanceListSortDirection
  }
  if (by && SORT_OPTIONS.has(by as InstanceListSortOptions)) {
    fromUrl.sortBy = by as InstanceListSortOptions
  }
  if (f && FILTER_POWER.has(f as InstanceListFilterPower)) {
    fromUrl.filterPower = f as InstanceListFilterPower
  }
  if (q !== null) {
    fromUrl.searchQuery = q
  }

  return { ...DEFAULTS, ...fromUrl }
}

export const loadInstanceListPrefsFromStorage = (): InstanceListPrefs => {
  if (typeof localStorage === 'undefined') return DEFAULTS
  return sanitize(parseStored(localStorage.getItem(STORAGE_KEY)) ?? {})
}

export const saveInstanceListPrefs = (prefs: InstanceListPrefs) => {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}
