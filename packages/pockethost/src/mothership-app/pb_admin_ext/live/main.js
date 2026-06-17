document.head.appendChild(
  t.link({
    rel: 'stylesheet',
    href: '/_/extensions/live/style.css',
  })
)
document.head.appendChild(
  t.link({
    rel: 'stylesheet',
    href: '/_/extensions/live/vendor/leaflet.css',
  })
)
;(() => {
  if (document.querySelector('script[data-live-leaflet]')) return
  const script = document.createElement('script')
  script.src = '/_/extensions/live/vendor/leaflet.js'
  script.defer = true
  script.dataset.liveLeaflet = '1'
  document.head.appendChild(script)
})()

const HISTORY_MAX = 360
const SPARKLINE_POINTS = 48
const SPARKLINE_HEIGHT = 40
const SPARKLINE_WIDTH = 100
const GROWTH_WINDOW_DAYS = 30
const GROWTH_CHART_WIDTH = 640
const GROWTH_CHART_HEIGHT = 88
const NO_AUTO_CANCEL = { $autoCancel: false }
const LIVE_PLATFORM_TOPIC = 'mothership/live/platform'
const LIVE_VIEW_STATS_TOPIC = 'mothership/live/view-stats'
const INSTANCE_STATUSES = [
  { key: 'running', label: 'Running', tone: 'ok' },
  { key: 'starting', label: 'Starting', tone: 'ok' },
  { key: 'porting', label: 'Porting', tone: 'ok' },
  { key: 'vacuuming', label: 'Vacuuming', tone: 'warn' },
  { key: 'idle', label: 'Idle' },
  { key: 'failed', label: 'Failed', tone: 'warn' },
]
const historyByEdgeId = {}
const edgeRecordsById = {}
const platformHistory = []
let livePage = null

const VIEW_STAT_GROUPS = [
  {
    title: 'Verified totals',
    widgets: [
      { key: 'totalUsers', label: 'Users' },
      { key: 'totalInstances', label: 'Instances' },
    ],
  },
  {
    title: 'Subscribers',
    widgets: [
      { key: 'totalFreeSubscribers', label: 'Free' },
      { key: 'totalProSubscribers', label: 'Premium' },
      { key: 'totalProMonthSubscribers', label: 'Premium monthly' },
      { key: 'totalProYearSubscribers', label: 'Premium yearly' },
      { key: 'totalLegacySubscribers', label: 'Legacy' },
      { key: 'totalFounderSubscribers', label: 'Founder' },
      { key: 'totalFlounderSubscribers', label: 'Flounder' },
    ],
  },
]

const VIEW_INTERVAL_STATS = [
  {
    title: 'New users',
    intervals: [
      { label: '1h', key: 'newUsersLastHour' },
      { label: '24h', key: 'newUsersLast24Hours' },
      { label: '7d', key: 'newUsersLast7Days' },
      { label: '30d', key: 'newUsersLast30Days' },
    ],
  },
  {
    title: 'New instances',
    intervals: [
      { label: '1h', key: 'newInstancesLastHour' },
      { label: '24h', key: 'newInstancesLast24Hours' },
      { label: '7d', key: 'newInstancesLast7Days' },
      { label: '30d', key: 'newInstancesLast30Days' },
    ],
  },
  {
    title: 'Active instances',
    subtitle: 'updated in window',
    intervals: [
      { label: '1h', key: 'totalInstancesLastHour' },
      { label: '24h', key: 'totalInstancesLast24Hours' },
      { label: '7d', key: 'totalInstancesLast7Days' },
      { label: '30d', key: 'totalInstancesLast30Days' },
    ],
  },
]

function edgeDisplayName(edge) {
  return edge.label || edge.edge_id || 'edge'
}

function edgeTrafficFromHistory(edgeId) {
  const history = historyByEdgeId[edgeId] || []
  return {
    requests: history.map((point) => normalizeStats(point.stats).requests || 0),
    errors: history.map((point) => normalizeStats(point.stats).errors || 0),
  }
}

function isAbortError(err) {
  const msg = String(err?.message || err)
  return err?.status === 0 || msg.includes('autocancelled') || msg.includes('aborted')
}

function normalizeStats(stats) {
  if (!stats) return {}
  if (typeof stats === 'string') {
    try {
      return JSON.parse(stats)
    } catch {
      return {}
    }
  }
  return stats
}

function rememberPlatformPoint(platform) {
  platformHistory.push({
    t: Date.now(),
    statusCounts: { ...platform.statusCounts },
    users: platform.totalUsers || 0,
  })
  if (platformHistory.length > HISTORY_MAX) {
    platformHistory.shift()
  }
  platform.chartTick = (platform.chartTick || 0) + 1
}

function platformSparkSeries(key) {
  return platformHistory
    .map((point) => {
      if (key === 'users') return point.users || 0
      return point.statusCounts?.[key] || 0
    })
    .slice(-SPARKLINE_POINTS)
}

function rememberPoint(edgeId, stats) {
  if (!historyByEdgeId[edgeId]) {
    historyByEdgeId[edgeId] = []
  }
  historyByEdgeId[edgeId].push({ t: Date.now(), stats: normalizeStats(stats) })
  if (historyByEdgeId[edgeId].length > HISTORY_MAX) {
    historyByEdgeId[edgeId].shift()
  }
  if (livePage?.platform) {
    livePage.platform.edgeChartTick = (livePage.platform.edgeChartTick || 0) + 1
  }
}

function upsertEdge(list, record) {
  const idx = list.findIndex((row) => row.id === record.id)
  if (idx >= 0) {
    list[idx] = record
  } else {
    list.push(record)
  }
  list.sort((a, b) => String(a.edge_id).localeCompare(String(b.edge_id)))
}

function formatLastSeen(value) {
  if (!value) return '—'
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  const sec = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000))
  if (sec < 5) return 'just now'
  if (sec < 60) return `${sec}s ago`
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  return date.toLocaleString()
}

function topEntries(mapLike, limit = 5) {
  if (!mapLike) return []
  const entries = Array.isArray(mapLike) ? mapLike : Object.entries(mapLike).map(([key, count]) => [key, count])
  return entries
    .slice()
    .sort((a, b) => (b[1] || 0) - (a[1] || 0))
    .slice(0, limit)
}

const COUNTRY_LL = {
  AR: [-38.4, -63.6],
  AT: [47.5, 14.5],
  AU: [-25.3, 133.8],
  BE: [50.5, 4.5],
  BR: [-14.2, -51.9],
  CA: [56.1, -106.3],
  CH: [46.8, 8.2],
  CL: [-35.7, -71.5],
  CN: [35.9, 104.2],
  CO: [4.6, -74.3],
  CZ: [49.8, 15.5],
  DE: [51.2, 10.4],
  DK: [56.3, 9.5],
  EG: [26.8, 30.8],
  ES: [40.5, -3.7],
  FI: [61.9, 25.7],
  FR: [46.2, 2.2],
  GB: [55.4, -3.4],
  GR: [39.1, 21.8],
  HK: [22.3, 114.2],
  ID: [-0.8, 113.9],
  IE: [53.4, -8.2],
  IL: [31.0, 34.8],
  IN: [20.6, 78.9],
  IR: [32.4, 53.7],
  IT: [41.9, 12.6],
  JP: [36.2, 138.3],
  KR: [35.9, 127.8],
  MX: [23.6, -102.5],
  MY: [4.2, 101.9],
  NG: [9.1, 8.7],
  NL: [52.1, 5.3],
  NO: [60.5, 8.5],
  NZ: [-40.9, 174.9],
  PH: [12.9, 121.8],
  PL: [51.9, 19.1],
  PT: [39.4, -8.0],
  RO: [45.9, 24.9],
  RU: [61.5, 105.3],
  SA: [23.9, 45.1],
  SE: [60.1, 18.6],
  SG: [1.35, 103.8],
  TH: [15.9, 100.9],
  TR: [38.9, 35.2],
  TW: [23.7, 121.0],
  UA: [48.4, 31.2],
  US: [39.8, -98.5],
  VN: [14.1, 108.3],
  ZA: [-30.6, 22.9],
}

const HEAT_FADE_MS = 30000
const HEAT_RISE_MS = 2400
const HEAT_RENDER_MS = 48

const countryHeatByEdgeId = {}
const countryMapsByEdgeId = {}
const countryMapViews = {}
const pendingLiveMapEdgeIds = new Set()
const countryMapMounting = new Set()
let heatAnimHandle = 0
let heatLastFrame = 0
let heatLastRender = 0
let leafletReady = null
let liveMapWatcherStarted = false

const LIVE_MAP_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const LIVE_MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

function liveMapElementId(edgeId) {
  return `live-map-${String(edgeId || 'edge').replace(/[^a-zA-Z0-9_-]/g, '')}`
}

function liveLegendElementId(edgeId) {
  return `live-legend-${String(edgeId || 'edge').replace(/[^a-zA-Z0-9_-]/g, '')}`
}

function loadLeaflet() {
  if (globalThis.L) return Promise.resolve(globalThis.L)
  if (leafletReady) return leafletReady

  leafletReady = new Promise((resolve, reject) => {
    const started = Date.now()
    const wait = () => {
      if (globalThis.L) {
        resolve(globalThis.L)
        return
      }
      if (Date.now() - started > 15000) {
        reject(new Error('Leaflet load timeout'))
        return
      }
      setTimeout(wait, 50)
    }
    wait()
  })

  return leafletReady
}

function countryLatLng(code) {
  const ll = COUNTRY_LL[code]
  if (!ll) return null
  const [lat, lon] = ll
  return [lat, lon]
}

function heatPalette(hot) {
  const root = getComputedStyle(document.documentElement)
  const accent = root.getPropertyValue('--accentColor').trim() || '#4da1ff'
  const warning = root.getPropertyValue('--warningColor').trim() || '#ffb020'
  const fill = hot ? warning : accent
  return {
    fill,
    stroke: hot ? warning : accent,
  }
}

function updateCountryLegend(entry, rows) {
  if (!entry?.legendEl) return

  if (!rows.length) {
    entry.legendEl.innerHTML =
      '<span class="live-country-legend-chip live-country-legend-empty">Warming up traffic map…</span>'
    return
  }

  entry.legendEl.innerHTML = rows
    .slice(0, 4)
    .map(([code, count]) => {
      const label = Math.round(count)
      return `<span class="live-country-legend-chip" title="~${count.toFixed(1)} hits">${countryFlagEmoji(code)} ${escapeHtml(code)} <strong>${label}</strong></span>`
    })
    .join('')
}

function refreshCountryHeatLayer(edgeId) {
  const entry = countryMapsByEdgeId[edgeId]
  const L = entry?.L || globalThis.L
  if (!entry?.layer || !L) return

  const rows = animatedCountryRows(edgeId)
  const max = rows[0]?.[1] || 1
  const seen = new Set()

  for (const [code, count] of rows.slice(0, 24)) {
    const latlng = countryLatLng(code)
    if (!latlng) continue

    seen.add(code)
    const intensity = count / max
    const hot = intensity >= 0.82
    const colors = heatPalette(hot)
    const radius = 5 + intensity * 16
    const fillOpacity = 0.18 + intensity * 0.62
    const label = `${code} · ~${count.toFixed(1)} hits`

    let spot = entry.markers[code]
    if (!spot) {
      const core = L.circleMarker(latlng, {
        radius,
        fillColor: colors.fill,
        color: colors.stroke,
        weight: 1.2,
        opacity: 0.85,
        fillOpacity,
      })
        .bindTooltip(label, { direction: 'top', sticky: true, opacity: 0.92 })
        .addTo(entry.layer)

      const bloom = L.circleMarker(latlng, {
        radius: radius * 1.65,
        fillColor: colors.fill,
        color: colors.stroke,
        weight: 0,
        opacity: 0,
        fillOpacity: fillOpacity * 0.28,
        interactive: false,
        className: 'live-country-bloom-layer',
      }).addTo(entry.layer)

      entry.markers[code] = { core, bloom }
      spot = entry.markers[code]
    }

    spot.core.setLatLng(latlng)
    spot.core.setRadius(radius)
    spot.core.setStyle({
      fillColor: colors.fill,
      color: colors.stroke,
      fillOpacity,
    })
    spot.core.setTooltipContent(label)

    spot.bloom.setLatLng(latlng)
    spot.bloom.setRadius(radius * 1.65)
    spot.bloom.setStyle({
      fillColor: colors.fill,
      fillOpacity: fillOpacity * 0.28,
    })
  }

  for (const code of Object.keys(entry.markers)) {
    if (!seen.has(code)) {
      const spot = entry.markers[code]
      entry.layer.removeLayer(spot.core)
      entry.layer.removeLayer(spot.bloom)
      delete entry.markers[code]
    }
  }

  updateCountryLegend(entry, rows)
}

function refreshCountryHeatLayers() {
  for (const edgeId of Object.keys(countryHeatByEdgeId)) {
    refreshCountryHeatLayer(edgeId)
  }
}

function reparentCountryMap(edgeId, container, entry) {
  const mapEl = entry.map.getContainer()
  if (!mapEl || !container) return

  entry.legendEl = document.getElementById(liveLegendElementId(edgeId))

  // Leaflet uses the host element as the map container — same node, no DOM move.
  if (mapEl === container || container.contains(mapEl)) {
    entry.container = container
    requestAnimationFrame(() => {
      entry.map.invalidateSize(false)
      refreshCountryHeatLayer(edgeId)
    })
    return
  }

  container.replaceChildren()
  container.appendChild(mapEl)
  entry.container = container
  requestAnimationFrame(() => {
    entry.map.invalidateSize(false)
    refreshCountryHeatLayer(edgeId)
  })
}

async function mountCountryMap(edgeId, container) {
  if (!edgeId || !container) return
  if (countryMapMounting.has(edgeId)) return

  const existing = countryMapsByEdgeId[edgeId]
  if (existing?.map?.getContainer?.()) {
    const mapEl = existing.map.getContainer()
    if (mapEl === container || container.contains(mapEl)) {
      existing.container = container
      existing.legendEl = document.getElementById(liveLegendElementId(edgeId))
      return
    }
    reparentCountryMap(edgeId, container, existing)
    return
  }

  if (container.offsetHeight < 8) {
    requestAnimationFrame(() => void mountCountryMap(edgeId, container))
    return
  }

  countryMapMounting.add(edgeId)

  try {
    const L = await loadLeaflet()
    if (!L) throw new Error('Leaflet did not initialize')

    const mounted = countryMapsByEdgeId[edgeId]
    if (mounted?.map?.getContainer?.()) {
      const mapEl = mounted.map.getContainer()
      if (mapEl === container || container.contains(mapEl)) {
        mounted.container = container
        mounted.legendEl = document.getElementById(liveLegendElementId(edgeId))
        return
      }
      reparentCountryMap(edgeId, container, mounted)
      return
    }

    container.classList.remove('live-leaflet-host-error')
    delete container.dataset.mapError

    const saved = countryMapViews[edgeId]
    const map = L.map(container, {
      center: saved ? [saved.center.lat, saved.center.lng] : [20, 0],
      zoom: saved?.zoom ?? 2,
      minZoom: 2,
      maxZoom: 18,
      worldCopyJump: true,
      zoomControl: true,
      attributionControl: true,
    })

    L.tileLayer(LIVE_MAP_TILE_URL, {
      attribution: LIVE_MAP_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map)

    const layer = L.layerGroup().addTo(map)

    countryMapsByEdgeId[edgeId] = {
      map,
      layer,
      markers: {},
      legendEl: document.getElementById(liveLegendElementId(edgeId)),
      container,
      L,
    }

    map.on('moveend zoomend', () => {
      countryMapViews[edgeId] = {
        center: map.getCenter(),
        zoom: map.getZoom(),
      }
    })

    const settle = () => {
      map.invalidateSize(false)
      refreshCountryHeatLayer(edgeId)
    }
    requestAnimationFrame(settle)
    setTimeout(settle, 120)
  } catch (err) {
    console.error('[live] country map mount failed', edgeId, err)
    container.classList.add('live-leaflet-host-error')
    container.dataset.mapError = String(err?.message || err)
  } finally {
    countryMapMounting.delete(edgeId)
  }
}

function destroyCountryMap(edgeId, saveView = true) {
  const entry = countryMapsByEdgeId[edgeId]
  if (!entry) return

  if (saveView && entry.map) {
    countryMapViews[edgeId] = {
      center: entry.map.getCenter(),
      zoom: entry.map.getZoom(),
    }
  }

  entry.map?.remove()
  delete countryMapsByEdgeId[edgeId]
}

function scheduleLiveMapSync() {
  queueMicrotask(() => {
    for (const edgeId of pendingLiveMapEdgeIds) {
      const el = document.getElementById(liveMapElementId(edgeId))
      if (!el) continue
      const entry = countryMapsByEdgeId[edgeId]
      if (entry?.map?.getContainer?.() && el.contains(entry.map.getContainer())) continue
      void mountCountryMap(edgeId, el)
    }
  })
}

function trackLiveMapEdge(edgeId) {
  if (!edgeId) return
  pendingLiveMapEdgeIds.add(edgeId)
  scheduleLiveMapSync()
}

function ensureLiveMapWatcher() {
  if (liveMapWatcherStarted) return
  liveMapWatcherStarted = true

  scheduleLiveMapSync()

  window.addEventListener('hashchange', () => {
    if (location.hash.startsWith('#/live')) scheduleLiveMapSync()
  })

  setInterval(() => {
    if (!location.hash.startsWith('#/live')) return

    for (const edgeId of Object.keys(countryMapsByEdgeId)) {
      const el = document.getElementById(liveMapElementId(edgeId))
      if (!el || !document.body.contains(el)) {
        destroyCountryMap(edgeId)
        continue
      }
      const entry = countryMapsByEdgeId[edgeId]
      const mapEl = entry?.map?.getContainer?.()
      if (mapEl && mapEl !== el && !el.contains(mapEl)) {
        reparentCountryMap(edgeId, el, entry)
      }
    }
  }, 3000)
}

function liveMapHostProps(edgeId) {
  return {
    id: liveMapElementId(edgeId),
    className: 'live-leaflet-host',
  }
}

function syncCountryHeatTargets(edgeId, countriesLike) {
  if (!edgeId) return
  if (!countryHeatByEdgeId[edgeId]) {
    countryHeatByEdgeId[edgeId] = {}
  }

  const state = countryHeatByEdgeId[edgeId]
  const rows = topEntries(countriesLike, 32)
  const seen = new Set()

  for (const [rawCode, count] of rows) {
    const code = normalizeCountryCode(rawCode)
    if (!code) continue
    seen.add(code)
    if (!state[code]) {
      state[code] = { display: 0, target: 0 }
    }
    state[code].target = Number(count) || 0
  }

  for (const code of Object.keys(state)) {
    if (!seen.has(code)) {
      state[code].target = 0
    }
  }

  startCountryHeatAnimation()
}

function tickCountryHeat(dtMs) {
  if (!dtMs) return false

  let changed = false

  for (const edgeId of Object.keys(countryHeatByEdgeId)) {
    const state = countryHeatByEdgeId[edgeId]
    for (const code of Object.keys(state)) {
      const spot = state[code]
      const prev = spot.display

      if (spot.target > 0) {
        const step = Math.min(1, dtMs / HEAT_RISE_MS)
        spot.display += (spot.target - spot.display) * step
      } else if (spot.display > 0) {
        const step = Math.min(1, dtMs / HEAT_FADE_MS)
        spot.display *= 1 - step
        if (spot.display < 0.08) {
          spot.display = 0
          delete state[code]
        }
      }

      if (Math.abs(spot.display - prev) > 0.015) {
        changed = true
      }
    }
  }

  return changed
}

function startCountryHeatAnimation() {
  if (heatAnimHandle) return
  heatLastFrame = performance.now()

  const frame = (now) => {
    const dt = Math.min(120, now - heatLastFrame)
    heatLastFrame = now
    const changed = tickCountryHeat(dt)

    if (changed && now - heatLastRender >= HEAT_RENDER_MS) {
      refreshCountryHeatLayers()
      heatLastRender = now
    }

    heatAnimHandle = requestAnimationFrame(frame)
  }

  heatAnimHandle = requestAnimationFrame(frame)
}

function animatedCountryRows(edgeId) {
  const state = countryHeatByEdgeId[edgeId]
  if (!state) return []

  return Object.entries(state)
    .map(([code, spot]) => [code, spot.display])
    .filter(([, value]) => value > 0.08)
    .sort((a, b) => b[1] - a[1])
}

function normalizeCountryCode(raw) {
  const code = String(raw || '')
    .trim()
    .toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return null
  return code
}

function countryFlagEmoji(code) {
  if (!code) return '🌐'
  return String.fromCodePoint(...code.split('').map((char) => 0x1f1e6 - 65 + char.charCodeAt(0)))
}

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function liveEdgeMetaId(edgeId) {
  return `live-edge-meta-${String(edgeId || 'edge').replace(/[^a-zA-Z0-9_-]/g, '')}`
}

function liveEdgeStatusId(edgeId) {
  return `live-edge-status-${String(edgeId || 'edge').replace(/[^a-zA-Z0-9_-]/g, '')}`
}

function liveEdgeHostsId(edgeId) {
  return `live-edge-hosts-${String(edgeId || 'edge').replace(/[^a-zA-Z0-9_-]/g, '')}`
}

function liveEdgeIpsId(edgeId) {
  return `live-edge-ips-${String(edgeId || 'edge').replace(/[^a-zA-Z0-9_-]/g, '')}`
}

function renderTopTableHtml(title, rows) {
  if (!rows.length) {
    return `<div class="live-spark"><p class="live-section-title">${escapeHtml(title)}</p><p class="live-meta m-0">No data this window</p></div>`
  }

  const body = rows
    .map(([name, count]) => `<tr><td>${escapeHtml(String(name))}</td><td>${escapeHtml(String(count))}</td></tr>`)
    .join('')

  return `<div class="live-table-wrap"><p class="live-section-title m-b-10">${escapeHtml(title)}</p><table class="live-table"><thead><tr><th>Name</th><th>Hits</th></tr></thead><tbody>${body}</tbody></table></div>`
}

function refreshEdgePanelDom(recordId) {
  const record = edgeRecordsById[recordId]
  if (!record) return

  const history = historyByEdgeId[record.edge_id] || []
  const stats = normalizeStats(record.stats)
  const status = record.status || 'unknown'

  const meta = document.getElementById(liveEdgeMetaId(recordId))
  if (meta) {
    meta.textContent = `Last seen ${formatLastSeen(record.last_seen)} · ${history.length} heartbeats this session`
  }

  const statusEl = document.getElementById(liveEdgeStatusId(recordId))
  if (statusEl) {
    statusEl.className = `live-status ${status}`
    statusEl.textContent = status
  }

  const hostsEl = document.getElementById(liveEdgeHostsId(recordId))
  if (hostsEl) {
    hostsEl.innerHTML = renderTopTableHtml('Top hosts', topEntries(stats.hosts))
  }

  const ipsEl = document.getElementById(liveEdgeIpsId(recordId))
  if (ipsEl) {
    ipsEl.innerHTML = renderTopTableHtml('Top IPs', topEntries(stats.ips))
  }
}

function renderCountryHeatmap(edgeId) {
  return t.div(
    { className: 'live-country-map', id: liveMapElementId(edgeId) + '-panel' },
    t.p({ className: 'live-section-title m-b-10' }, 'Traffic heatmap'),
    t.div(liveMapHostProps(edgeId)),
    t.div({ id: liveLegendElementId(edgeId), className: 'live-country-legend' }),
    t.p({ className: 'live-map-attrib m-0 m-t-5' }, 'Drag to pan · scroll to zoom · © OpenStreetMap')
  )
}

function sparklineYs(values, height, scaleMax) {
  const pad = 2
  const inner = height - pad * 2
  const max = scaleMax ?? Math.max(0, ...values)

  if (max === 0) {
    const y = height - pad - 0.08 * inner
    return values.map(() => y)
  }

  return values.map((value) => {
    const v = Math.max(0, Number(value) || 0)
    return height - pad - (v / max) * inner
  })
}

function buildDualLinePaths(requestSeries, errorSeries) {
  const requests = requestSeries.slice(-SPARKLINE_POINTS)
  const errors = errorSeries.slice(-SPARKLINE_POINTS)
  const length = Math.max(requests.length, errors.length)
  if (!length) return null

  while (requests.length < length) requests.unshift(0)
  while (errors.length < length) errors.unshift(0)

  const width = SPARKLINE_WIDTH
  const height = SPARKLINE_HEIGHT
  const scaleMax = Math.max(0, ...requests, ...errors)
  const reqYs = sparklineYs(requests, height, scaleMax)
  const errYs = sparklineYs(errors, height, scaleMax)

  function toLine(values, ys) {
    if (values.length === 1) {
      const y = ys[0].toFixed(2)
      return `0,${y} ${width},${y}`
    }
    return values
      .map((_value, index) => {
        const x = (index / (values.length - 1)) * width
        return `${x.toFixed(2)},${ys[index].toFixed(2)}`
      })
      .join(' ')
  }

  return {
    requests: toLine(requests, reqYs),
    errors: toLine(errors, errYs),
    lastRequests: requests[requests.length - 1],
    lastErrors: errors[errors.length - 1],
  }
}

function buildSparkPaths(values) {
  const series = values.slice(-SPARKLINE_POINTS)
  if (!series.length) return null

  const width = SPARKLINE_WIDTH
  const height = SPARKLINE_HEIGHT
  const ys = sparklineYs(series, height)

  if (series.length === 1) {
    const y = ys[0].toFixed(2)
    return {
      area: `0,${height} 0,${y} ${width},${y} ${width},${height}`,
      line: `0,${y} ${width},${y}`,
    }
  }

  const coords = series.map((value, index) => {
    const x = (index / (series.length - 1)) * width
    return { x, y: ys[index], value }
  })

  const line = coords.map(({ x, y }) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
  const first = coords[0]
  const last = coords[coords.length - 1]
  const area = `0,${height} ${line} ${last.x.toFixed(2)},${height}`

  return { area, line, coords }
}

function sparkToneClass(kind) {
  if (kind === 'ok') return 'ok'
  if (kind === 'warn') return 'warn'
  if (kind === 'err') return 'err'
  return 'default'
}

function renderDualLineSpark(requestSeries, errorSeries, hasErrors) {
  const paths = buildDualLinePaths(requestSeries, errorSeries)
  if (!paths) {
    return t.div({ className: 'live-spark-chart live-spark-empty' }, t.span({ className: 'live-meta' }, 'Collecting…'))
  }

  const title = `req ${paths.lastRequests} · err ${paths.lastErrors}`
  const errStroke = hasErrors ? 'var(--dangerColor)' : 'var(--warningColor)'
  const svg = `<svg class="live-spark-chart" viewBox="0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}" preserveAspectRatio="none" role="img" aria-hidden="true"><title>${title}</title><polyline class="live-spark-line-req" points="${paths.requests}"></polyline><polyline class="live-spark-line-err" points="${paths.errors}" style="stroke:${errStroke}"></polyline></svg>`

  return t.div({
    className: 'live-spark-wrap live-spark-dual',
    innerHTML: svg,
  })
}

function renderSparkArea(values, kind) {
  const paths = buildSparkPaths(values)
  if (!paths) {
    return t.div({ className: 'live-spark-chart live-spark-empty' }, t.span({ className: 'live-meta' }, 'Collecting…'))
  }

  const tone = sparkToneClass(String(kind || 'default').trim())
  const title = paths.coords ? paths.coords.map(({ value }) => value).join(' → ') : String(values[values.length - 1])

  const svg = `<svg class="live-spark-chart" viewBox="0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}" preserveAspectRatio="none" role="img" aria-hidden="true"><title>${title}</title><polygon class="live-spark-fill" points="${paths.area}"></polygon><polyline class="live-spark-stroke" points="${paths.line}"></polyline></svg>`

  return t.div({
    className: `live-spark-wrap live-spark-${tone}`,
    innerHTML: svg,
  })
}

function renderUsersWidget(widget) {
  return t.div(
    { className: 'live-stat live-stat-users' },
    t.div({ className: 'live-stat-label' }, widget.label),
    t.div({ className: 'live-stat-value' }, String(widget.value ?? '—')),
    t.div(
      { className: 'live-stat-breakdown' },
      t.span({ className: 'ok' }, `${widget.verified ?? '—'} verified`),
      t.span({ className: 'live-stat-sep' }, ' · '),
      t.span(null, `${widget.unverified ?? '—'} unverified`)
    ),
    renderSparkArea(widget.series, 'default')
  )
}

function viewCount(value) {
  if (value == null || value === '') return 0
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function mapGrowthByDayRecord(record) {
  return {
    day: String(record.created_day ?? '').slice(0, 10),
    users: viewCount(record.users_count),
    instances: viewCount(record.instances_count),
  }
}

function fillGrowthWindow(sparseDays, windowDays = GROWTH_WINDOW_DAYS) {
  const byDay = new Map((sparseDays || []).map((row) => [row.day, row]))
  const points = []
  const end = new Date()
  end.setHours(0, 0, 0, 0)

  for (let i = windowDays - 1; i >= 0; i--) {
    const date = new Date(end)
    date.setDate(date.getDate() - i)
    const day = date.toISOString().slice(0, 10)
    const row = byDay.get(day)
    points.push({
      day,
      users: row?.users ?? 0,
      instances: row?.instances ?? 0,
    })
  }

  return points
}

function renderGrowthChart(series, loading, updatedAt) {
  if (loading) {
    return t.div(
      { className: 'live-growth-panel' },
      t.p({ className: 'live-section-title m-b-10' }, 'Growth by day (30 days)'),
      t.p({ className: 'live-meta m-0' }, 'Loading growth_by_day view…')
    )
  }

  const days = fillGrowthWindow(series)
  const maxUsers = Math.max(0, ...days.map((row) => row.users))
  const maxInstances = Math.max(0, ...days.map((row) => row.instances))
  const chartMax = Math.max(1, maxUsers, maxInstances)
  const totalUsers = days.reduce((sum, row) => sum + row.users, 0)
  const totalInstances = days.reduce((sum, row) => sum + row.instances, 0)
  const pad = { top: 6, right: 6, bottom: 18, left: 6 }
  const innerW = GROWTH_CHART_WIDTH - pad.left - pad.right
  const innerH = GROWTH_CHART_HEIGHT - pad.top - pad.bottom
  const barGap = innerW / days.length
  const bars = []

  for (let i = 0; i < days.length; i++) {
    const row = days[i]
    const groupW = Math.max(3, barGap * 0.72)
    const userBarW = groupW * 0.46
    const instBarW = groupW * 0.46
    const innerGap = groupW * 0.08
    const x0 = pad.left + i * barGap + (barGap - groupW) / 2
    const userH = row.users ? (row.users / chartMax) * innerH : 0
    const instH = row.instances ? (row.instances / chartMax) * innerH : 0
    const userY = pad.top + innerH - userH
    const instY = pad.top + innerH - instH
    bars.push(
      `<rect class="live-growth-bar live-growth-bar-users" x="${x0.toFixed(2)}" y="${userY.toFixed(2)}" width="${userBarW.toFixed(2)}" height="${userH.toFixed(2)}"><title>${escapeHtml(row.day)}: ${row.users} users</title></rect>`,
      `<rect class="live-growth-bar live-growth-bar-instances" x="${(x0 + userBarW + innerGap).toFixed(2)}" y="${instY.toFixed(2)}" width="${instBarW.toFixed(2)}" height="${instH.toFixed(2)}"><title>${escapeHtml(row.day)}: ${row.instances} instances</title></rect>`
    )
  }

  const firstDay = days[0]?.day?.slice(5) || ''
  const lastDay = days[days.length - 1]?.day?.slice(5) || ''
  const svg = `<svg class="live-growth-chart" viewBox="0 0 ${GROWTH_CHART_WIDTH} ${GROWTH_CHART_HEIGHT}" preserveAspectRatio="none" role="img" aria-label="growth_by_day users and instances, last 30 days"><rect class="live-growth-grid" x="${pad.left}" y="${pad.top}" width="${innerW}" height="${innerH}" rx="2"></rect><g class="live-growth-bars">${bars.join('')}</g><text class="live-growth-axis" x="${pad.left}" y="${GROWTH_CHART_HEIGHT - 4}">${escapeHtml(firstDay)}</text><text class="live-growth-axis live-growth-axis-end" x="${GROWTH_CHART_WIDTH - pad.right}" y="${GROWTH_CHART_HEIGHT - 4}">${escapeHtml(lastDay)}</text></svg>`

  return t.div(
    { className: 'live-growth-panel' },
    t.div(
      { className: 'live-growth-heading' },
      t.p({ className: 'live-section-title m-0' }, 'Growth by day (30 days)'),
      t.p({ className: 'live-meta m-0' }, `${totalUsers} users · ${totalInstances} instances`)
    ),
    t.div(
      { className: 'live-growth-legend' },
      t.span({ className: 'live-growth-legend-item live-growth-legend-users' }, 'Users'),
      t.span({ className: 'live-growth-legend-item live-growth-legend-instances' }, 'Instances')
    ),
    t.div({ className: 'live-growth-chart-wrap', innerHTML: svg }),
    updatedAt ? t.p({ className: 'live-meta m-t-10 m-b-0' }, `growth_by_day view · ${formatLastSeen(updatedAt)}`) : null
  )
}

function renderEdgeTrafficWidget(widget) {
  return t.div(
    { className: 'live-stat live-stat-edge-traffic' },
    t.div({ className: 'live-stat-label' }, widget.label),
    t.div(
      { className: 'live-stat-value live-stat-value-split' },
      t.span({ className: 'ok' }, `${widget.requests} req`),
      t.span({ className: 'live-stat-sep' }, ' · '),
      t.span({ className: widget.errors ? 'warn' : '' }, `${widget.errors} err`)
    ),
    renderDualLineSpark(widget.reqSeries, widget.errSeries, widget.errors > 0)
  )
}

function renderLiveStat(label, value, tone, seriesValues) {
  return t.div(
    { className: 'live-stat' },
    t.div({ className: 'live-stat-label' }, label),
    t.div({ className: `live-stat-value${tone ? ` ${tone}` : ''}` }, String(value ?? '—')),
    renderSparkArea(seriesValues, tone || 'default')
  )
}

function buildLiveWidgets(platform, edges) {
  const widgets = []

  for (const status of INSTANCE_STATUSES) {
    widgets.push({
      label: status.label,
      value: platform.statusCounts?.[status.key] ?? (platform.loading ? '…' : '—'),
      tone: status.tone,
      series: platformSparkSeries(status.key),
    })
  }

  widgets.push({
    kind: 'users',
    label: 'Users',
    value: platform.totalUsers ?? (platform.loading ? '…' : '—'),
    verified: platform.verifiedUsers ?? (platform.loading ? '…' : '—'),
    unverified: platform.unverifiedUsers ?? (platform.loading ? '…' : '—'),
    series: platformSparkSeries('users'),
  })

  for (const edge of edges || []) {
    const stats = normalizeStats(edge.stats)
    const { requests: reqSeries, errors: errSeries } = edgeTrafficFromHistory(edge.edge_id)
    widgets.push({
      kind: 'edge-traffic',
      label: edgeDisplayName(edge),
      requests: stats.requests || 0,
      errors: stats.errors || 0,
      reqSeries,
      errSeries,
    })
  }

  return widgets
}

function renderWidgetGrid(widgets) {
  return t.div(
    { className: 'live-platform-grid live-widget-grid' },
    ...widgets.map((widget) => {
      if (widget.kind === 'edge-traffic') return renderEdgeTrafficWidget(widget)
      if (widget.kind === 'users') return renderUsersWidget(widget)
      return renderLiveStat(widget.label, widget.value, widget.tone, widget.series)
    })
  )
}

function renderPlainStat(label, value, tone) {
  return t.div(
    { className: 'live-stat' },
    t.div({ className: 'live-stat-label' }, label),
    t.div({ className: `live-stat-value${tone ? ` ${tone}` : ''}` }, String(value ?? '—'))
  )
}

function renderIntervalStatWidget(spec, viewStats) {
  const loading = viewStats.loading

  return t.div(
    { className: 'live-stat live-stat-intervals', key: spec.title },
    t.div({ className: 'live-stat-label' }, spec.title),
    spec.subtitle ? t.p({ className: 'live-stat-sublabel m-0' }, spec.subtitle) : null,
    t.div(
      { className: 'live-interval-grid' },
      ...spec.intervals.map(({ label, key }) =>
        t.div(
          { className: 'live-interval-cell', key },
          t.span({ className: 'live-interval-label' }, label),
          t.span({ className: 'live-interval-value' }, loading ? '…' : String(viewStats[key] ?? '—'))
        )
      )
    )
  )
}

function renderViewStatsGroup(group, viewStats) {
  const widgets = group.widgets.map((widget) => ({
    label: widget.label,
    value: viewStats.loading ? '…' : (viewStats[widget.key] ?? '—'),
    tone: widget.tone,
  }))

  return t.div(
    { className: 'live-viewstats-group', key: group.title },
    t.p({ className: 'live-section-title m-b-10' }, group.title),
    t.div(
      { className: 'live-platform-grid live-widget-grid' },
      ...widgets.map((widget) => renderPlainStat(widget.label, widget.value, widget.tone))
    )
  )
}

function renderViewStatsPanel(viewStats) {
  return t.div(
    { className: 'live-platform-panel live-viewstats-panel' },
    t.div(
      { className: 'live-section-heading-row' },
      t.h2({ className: 'live-section-heading m-0' }, 'Stats view'),
      t.p({ className: 'live-meta m-0' }, 'Rolling windows from the stats SQL view · refreshes every minute')
    ),
    ...VIEW_STAT_GROUPS.map((group) => () => renderViewStatsGroup(group, viewStats)),
    t.div(
      { className: 'live-viewstats-group live-viewstats-activity' },
      t.p({ className: 'live-section-title m-b-10' }, 'Activity'),
      t.div(
        { className: 'live-platform-grid live-widget-grid live-interval-widgets' },
        ...VIEW_INTERVAL_STATS.map((spec) => renderIntervalStatWidget(spec, viewStats))
      )
    ),
    () =>
      viewStats.loading
        ? t.p({ className: 'live-meta m-t-10 m-b-0' }, 'Loading stats view…')
        : viewStats.lastRefresh
          ? t.p({ className: 'live-meta m-t-10 m-b-0' }, `Stats view updated ${formatLastSeen(viewStats.lastRefresh)}`)
          : t.p({ className: 'live-meta m-t-10 m-b-0' }, 'Waiting for stats view stream…')
  )
}

function renderPlatformPanel(platform, edges, growth, onRefresh, chartTick) {
  void chartTick
  void edges

  return t.div(
    { className: 'live-platform-panel' },
    t.div(
      { className: 'live-section-heading-row' },
      t.h2({ className: 'live-section-heading m-0' }, 'Platform'),
      t.button(
        {
          type: 'button',
          className: 'btn btn-secondary btn-sm live-refresh-btn',
          disabled: platform.loading || growth.loading,
          title: 'Recount platform totals from the database',
          onclick: (e) => {
            e.preventDefault()
            onRefresh()
          },
        },
        platform.loading || growth.loading ? 'Recounting…' : t.i({ className: 'ri-refresh-line' })
      )
    ),
    renderWidgetGrid(buildLiveWidgets(platform, edges)),
    () => renderGrowthChart(growth.days, growth.loading, growth.updatedAt),
    () =>
      platform.loading
        ? t.p({ className: 'live-meta m-t-10 m-b-0' }, 'Recounting from database…')
        : platform.lastRefresh
          ? t.p(
              { className: 'live-meta m-t-10 m-b-0' },
              platform.lastManualRecount
                ? `Recounted from database ${formatLastSeen(platform.lastManualRecount)}`
                : `Platform counts updated ${formatLastSeen(platform.lastRefresh)}`
            )
          : t.p({ className: 'live-meta m-t-10 m-b-0' }, 'Waiting for platform stats stream…')
  )
}

function renderTopTable(title, rows) {
  if (!rows.length) {
    return t.div(
      { className: 'live-spark' },
      t.p({ className: 'live-section-title' }, title),
      t.p({ className: 'live-meta m-0' }, 'No data this window')
    )
  }

  return t.div(
    { className: 'live-table-wrap' },
    t.p({ className: 'live-section-title m-b-10' }, title),
    t.table(
      { className: 'live-table' },
      t.thead(null, t.tr(null, t.th(null, 'Name'), t.th(null, 'Hits'))),
      t.tbody(null, ...rows.map(([name, count]) => t.tr(null, t.td(null, name), t.td(null, String(count)))))
    )
  )
}

function renderEdgePanel(edge) {
  const latest = edgeRecordsById[edge.id] || edge
  const stats = normalizeStats(latest.stats)
  const history = historyByEdgeId[latest.edge_id] || []
  const status = latest.status || 'unknown'
  const hosts = topEntries(stats.hosts)
  const ips = topEntries(stats.ips)

  return t.div(
    { className: 'live-edge-panel' },
    t.div(
      { className: 'live-edge-header' },
      t.div(
        null,
        t.h3({ className: 'live-edge-title' }, latest.label || latest.edge_id),
        t.p({ className: 'live-edge-subtitle' }, latest.edge_id)
      ),
      t.span({ id: liveEdgeStatusId(edge.id), className: `live-status ${status}` }, status)
    ),
    t.p(
      { id: liveEdgeMetaId(edge.id), className: 'live-meta m-0' },
      `Last seen ${formatLastSeen(latest.last_seen)} · ${history.length} heartbeats this session`
    ),
    renderCountryHeatmap(edge.id),
    t.div(
      { className: 'grid sm' },
      t.div({ id: liveEdgeHostsId(edge.id), className: 'col-lg-6 col-md-12' }, renderTopTable('Top hosts', hosts)),
      t.div({ id: liveEdgeIpsId(edge.id), className: 'col-lg-6 col-md-12' }, renderTopTable('Top IPs', ips))
    ),
    t.details({ className: 'live-raw' }, t.summary(null, 'Raw stats JSON'), t.pre(null, JSON.stringify(stats, null, 2)))
  )
}

app.store.headerLinks.push({
  href: '#/live',
  icon: 'ri-pulse-line',
  label: 'Live',
})

app.routes.superuserOnly('#/live', () => {
  if (!livePage) {
    livePage = {
      data: store({
        edges: [],
        error: '',
        edgesSubscribed: false,
        platformSubscribed: false,
        viewStatsSubscribed: false,
      }),
      platform: store({
        statusCounts: {},
        totalUsers: null,
        verifiedUsers: null,
        unverifiedUsers: null,
        loading: true,
        lastRefresh: null,
        lastManualRecount: null,
        chartTick: 0,
        edgeChartTick: 0,
      }),
      growth: store({
        days: [],
        loading: true,
        updatedAt: null,
      }),
      viewStats: store({
        loading: true,
        lastRefresh: null,
      }),
    }
    startLivePage(livePage)
  }

  const { data, platform, growth } = livePage
  const { viewStats } = livePage

  return t.div(
    { className: 'page page-live-edges' },
    t.div(
      { className: 'page-content' },
      t.div(
        { className: 'page-header page-header-row' },
        t.div(
          { className: 'flex-fill' },
          t.h1({ className: 'm-0' }, 'Live'),
          t.p(
            { className: 'txt-hint m-t-5 m-b-0' },
            'Realtime mothership fleet view — platform counts stream from hooks, edge traffic updates live.'
          )
        )
      ),
      () => (data.error ? t.div({ className: 'txt-danger m-b-base' }, data.error) : null),
      () =>
        renderPlatformPanel(
          platform,
          data.edges,
          growth,
          () => void refreshLivePlatform(livePage),
          platform.chartTick + platform.edgeChartTick
        ),
      () => renderViewStatsPanel(viewStats),
      t.h2({ className: 'live-section-heading live-divider' }, 'Edges'),
      () =>
        data.edges.length
          ? t.div(
              { className: 'grid sm' },
              ...data.edges.map((edge) =>
                t.div({ className: 'col-lg-6 col-md-12 m-b-base', key: edge.id }, renderEdgePanel(edge))
              )
            )
          : t.div(
              { className: 'live-empty' },
              t.p({ className: 'm-0' }, 'No edges reporting yet.'),
              t.p(
                { className: 'm-t-10 m-b-0 txt-hint' },
                'Start an edge daemon with mothership credentials configured.'
              )
            )
    )
  )
})

function parsePlatformPayload(raw) {
  if (!raw) return null

  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  if (typeof raw === 'object') {
    if (typeof raw.data === 'string') {
      try {
        return JSON.parse(raw.data)
      } catch {
        return raw.data
      }
    }
    if (raw.statusCounts) return raw
    if (raw.data && typeof raw.data === 'object') return raw.data
  }

  return null
}

function applyPlatformPayload(platform, payload, fromManualRefresh = false) {
  const stats = parsePlatformPayload(payload)
  if (!stats?.statusCounts) return false

  platform.statusCounts = stats.statusCounts
  platform.totalUsers = stats.totalUsers ?? platform.totalUsers
  platform.verifiedUsers = stats.verifiedUsers ?? platform.verifiedUsers
  platform.unverifiedUsers = stats.unverifiedUsers ?? platform.unverifiedUsers
  platform.lastRefresh = stats.updatedAt || new Date().toISOString()
  platform.loading = false
  platform.lastManualRecount = fromManualRefresh ? platform.lastRefresh : null
  rememberPlatformPoint(platform)
  return true
}

function parseViewStatsPayload(raw) {
  if (!raw) return null

  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  if (typeof raw === 'object') {
    if (typeof raw.data === 'string') {
      try {
        return JSON.parse(raw.data)
      } catch {
        return raw.data
      }
    }
    if (raw.totalUsers != null || raw.total_users != null) return raw
    if (raw.data && typeof raw.data === 'object') return raw.data
  }

  return null
}

function mapStatsViewRecord(record) {
  if (!record) return null

  return {
    totalUsers: viewCount(record.total_users ?? record.totalUsers),
    totalLegacySubscribers: viewCount(record.total_legacy_subscribers ?? record.totalLegacySubscribers),
    totalFreeSubscribers: viewCount(record.total_free_subscribers ?? record.totalFreeSubscribers),
    totalProSubscribers: viewCount(record.total_pro_subscribers ?? record.totalProSubscribers),
    totalProMonthSubscribers: viewCount(record.total_pro_month_subscribers ?? record.totalProMonthSubscribers),
    totalProYearSubscribers: viewCount(record.total_pro_year_subscribers ?? record.totalProYearSubscribers),
    totalFounderSubscribers: viewCount(record.total_founder_subscribers ?? record.totalFounderSubscribers),
    totalFlounderSubscribers: viewCount(record.total_flounder_subscribers ?? record.totalFlounderSubscribers),
    newUsersLastHour: viewCount(record.new_users_last_hour ?? record.newUsersLastHour),
    newUsersLast24Hours: viewCount(record.new_users_last_24_hours ?? record.newUsersLast24Hours),
    newUsersLast7Days: viewCount(record.new_users_last_7_days ?? record.newUsersLast7Days),
    newUsersLast30Days: viewCount(record.new_users_last_30_days ?? record.newUsersLast30Days),
    totalInstances: viewCount(record.total_instances ?? record.totalInstances),
    totalInstancesLastHour: viewCount(record.total_instances_last_hour ?? record.totalInstancesLastHour),
    totalInstancesLast24Hours: viewCount(record.total_instances_last_24_hours ?? record.totalInstancesLast24Hours),
    totalInstancesLast7Days: viewCount(record.total_instances_last_7_days ?? record.totalInstancesLast7Days),
    totalInstancesLast30Days: viewCount(record.total_instances_last_30_days ?? record.totalInstancesLast30Days),
    newInstancesLastHour: viewCount(record.new_instances_last_hour ?? record.newInstancesLastHour),
    newInstancesLast24Hours: viewCount(record.new_instances_last_24_hours ?? record.newInstancesLast24Hours),
    newInstancesLast7Days: viewCount(record.new_instances_last_7_days ?? record.newInstancesLast7Days),
    newInstancesLast30Days: viewCount(record.new_instances_last_30_days ?? record.newInstancesLast30Days),
    updatedAt: record.updatedAt || new Date().toISOString(),
  }
}

function applyViewStatsPayload(viewStats, payload) {
  const parsed = parseViewStatsPayload(payload)
  const stats = parsed?.total_users != null ? mapStatsViewRecord(parsed) : parsed
  if (!stats || (stats.totalUsers == null && stats.totalInstances == null)) return false

  for (const key of Object.keys(stats)) {
    if (key === 'updatedAt') {
      viewStats.lastRefresh = stats.updatedAt
      continue
    }
    viewStats[key] = stats[key]
  }

  viewStats.loading = false
  if (!viewStats.lastRefresh) {
    viewStats.lastRefresh = new Date().toISOString()
  }
  return true
}

async function loadUserGrowth(growth) {
  growth.loading = true
  try {
    const cutoff = new Date()
    cutoff.setHours(0, 0, 0, 0)
    cutoff.setDate(cutoff.getDate() - (GROWTH_WINDOW_DAYS - 1))
    const cutoffDay = cutoff.toISOString().slice(0, 10)
    const result = await app.pb.collection('growth_by_day').getList(1, GROWTH_WINDOW_DAYS + 10, {
      sort: '-created_day',
      ...NO_AUTO_CANCEL,
    })
    growth.days = result.items
      .map(mapGrowthByDayRecord)
      .filter((row) => row.day && row.day >= cutoffDay)
      .reverse()
    growth.updatedAt = new Date().toISOString()
  } catch (err) {
    if (!isAbortError(err)) {
      growth.days = []
    }
  } finally {
    growth.loading = false
  }
}

async function refreshLivePlatform(livePage) {
  const { data, platform, growth } = livePage
  if (platform.loading || growth.loading) return

  platform.loading = true
  growth.loading = true
  data.error = ''
  try {
    const stats = await app.pb.send('/api/admin/live/platform/refresh', { method: 'POST' })
    if (!applyPlatformPayload(platform, stats, true)) {
      throw new Error('Refresh returned empty platform stats')
    }
    await loadUserGrowth(growth)
  } catch (err) {
    if (!isAbortError(err)) {
      data.error = String(err)
    }
  } finally {
    platform.loading = false
    growth.loading = false
  }
}

async function loadViewStats(viewStats) {
  viewStats.loading = true
  try {
    const result = await app.pb.collection('stats').getList(1, 1, NO_AUTO_CANCEL)
    const mapped = mapStatsViewRecord(result.items[0])
    if (!mapped || !applyViewStatsPayload(viewStats, mapped)) {
      viewStats.loading = false
    }
  } catch (err) {
    if (!isAbortError(err)) {
      viewStats.loading = false
    }
  }
}

function startLivePage(livePage) {
  const { data, platform, growth, viewStats } = livePage
  ensureLiveMapWatcher()
  void loadLeaflet()

  async function loadEdges() {
    try {
      data.error = ''
      data.edges = await app.pb.collection('edges').getFullList({ sort: 'edge_id', ...NO_AUTO_CANCEL })
      for (const edge of data.edges) {
        edgeRecordsById[edge.id] = edge
        trackLiveMapEdge(edge.id)
        rememberPoint(edge.edge_id, edge.stats)
        syncCountryHeatTargets(edge.id, normalizeStats(edge.stats).countries)
      }
      scheduleLiveMapSync()
    } catch (err) {
      data.error = String(err)
    }
  }

  function ensureEdgeSubscribe() {
    if (data.edgesSubscribed) {
      return
    }
    data.edgesSubscribed = true
    app.pb.collection('edges').subscribe('*', (event) => {
      const record = event.record
      edgeRecordsById[record.id] = record
      rememberPoint(record.edge_id, record.stats)
      syncCountryHeatTargets(record.id, normalizeStats(record.stats).countries)

      if (event.action === 'create') {
        upsertEdge(data.edges, record)
        trackLiveMapEdge(record.id)
        scheduleLiveMapSync()
        return
      }

      if (event.action === 'delete') {
        delete edgeRecordsById[record.id]
        pendingLiveMapEdgeIds.delete(record.id)
        data.edges = data.edges.filter((row) => row.id !== record.id)
        destroyCountryMap(record.id)
        return
      }

      refreshEdgePanelDom(record.id)
    })
  }

  function ensurePlatformSubscribe() {
    if (data.platformSubscribed) {
      return
    }
    data.platformSubscribed = true

    app.pb.realtime
      .subscribe(LIVE_PLATFORM_TOPIC, (event) => {
        applyPlatformPayload(platform, event)
      })
      .catch((err) => {
        data.error = String(err)
        platform.loading = false
      })
  }

  function ensureViewStatsSubscribe() {
    if (data.viewStatsSubscribed) {
      return
    }
    data.viewStatsSubscribed = true

    app.pb.realtime
      .subscribe(LIVE_VIEW_STATS_TOPIC, (event) => {
        applyViewStatsPayload(viewStats, event)
      })
      .catch((err) => {
        if (!isAbortError(err)) {
          data.error = String(err)
          viewStats.loading = false
        }
      })
  }

  loadEdges()
  loadUserGrowth(growth)
  loadViewStats(viewStats)
  ensureEdgeSubscribe()
  ensurePlatformSubscribe()
  ensureViewStatsSubscribe()
}
