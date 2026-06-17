document.head.appendChild(
  t.link({
    rel: 'stylesheet',
    href: '/_/extensions/live/style.css',
  })
)

const HISTORY_MAX = 360
const SPARKLINE_POINTS = 48
const SPARKLINE_HEIGHT = 40
const SPARKLINE_WIDTH = 100
const NO_AUTO_CANCEL = { $autoCancel: false }
const LIVE_PLATFORM_TOPIC = 'mothership/live/platform'
const INSTANCE_STATUSES = [
  { key: 'running', label: 'Running', tone: 'ok' },
  { key: 'starting', label: 'Starting', tone: 'ok' },
  { key: 'porting', label: 'Porting', tone: 'ok' },
  { key: 'vacuuming', label: 'Vacuuming', tone: 'warn' },
  { key: 'idle', label: 'Idle' },
  { key: 'failed', label: 'Failed', tone: 'warn' },
]
const historyByEdgeId = {}
const platformHistory = []
let livePage = null

function isAbortError(err) {
  const msg = String(err?.message || err)
  return err?.status === 0 || msg.includes('autocancelled') || msg.includes('aborted')
}

function sumStatusCounts(statusCounts) {
  return Object.values(statusCounts || {}).reduce((sum, n) => sum + (n || 0), 0)
}

function activeInstanceCount(statusCounts) {
  return (
    (statusCounts?.running || 0) +
    (statusCounts?.starting || 0) +
    (statusCounts?.porting || 0) +
    (statusCounts?.vacuuming || 0)
  )
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
  if (livePage?.data) {
    livePage.data.chartTick = (livePage.data.chartTick || 0) + 1
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

function sparklineYs(values, height) {
  const pad = 2
  const inner = height - pad * 2
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min

  if (span === 0) {
    const level = max === 0 ? 0.08 : 0.72
    const y = height - pad - level * inner
    return values.map(() => y)
  }

  return values.map((value) => height - pad - ((value - min) / span) * inner)
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

function renderLiveStat(label, value, tone, seriesValues) {
  return t.div(
    { className: 'live-stat' },
    t.div({ className: 'live-stat-label' }, label),
    t.div({ className: `live-stat-value${tone ? ` ${tone}` : ''}` }, String(value ?? '—')),
    renderSparkArea(seriesValues, tone || 'default')
  )
}

function renderPlatformStat(label, value, tone, seriesKey, chartTick) {
  void chartTick
  return renderLiveStat(label, value, tone, platformSparkSeries(seriesKey))
}

function renderPlatformPanel(platform, onRefresh) {
  const totalInstances = sumStatusCounts(platform.statusCounts)
  const chartTick = platform.chartTick || 0

  return t.div(
    { className: 'live-platform-panel' },
    t.div(
      { className: 'live-section-heading-row' },
      t.h2({ className: 'live-section-heading m-0' }, 'Platform'),
      t.button(
        {
          type: 'button',
          className: 'btn btn-secondary btn-sm live-refresh-btn',
          disabled: platform.loading,
          title: 'Recount platform totals from the database',
          onClick: onRefresh,
        },
        platform.loading ? 'Recounting…' : t.i({ className: 'ri-refresh-line' })
      )
    ),
    t.div(
      { className: 'live-platform-grid' },
      ...INSTANCE_STATUSES.map((status) =>
        renderPlatformStat(
          status.label,
          platform.statusCounts?.[status.key] ?? (platform.loading ? '…' : '—'),
          status.tone,
          status.key,
          chartTick
        )
      ),
      renderPlatformStat('Users', platform.totalUsers ?? (platform.loading ? '…' : '—'), '', 'users', chartTick)
    ),
    () =>
      platform.loading
        ? t.p({ className: 'live-meta m-t-10 m-b-0' }, 'Recounting from database…')
        : t.p(
            { className: 'live-meta m-t-10 m-b-0' },
            platform.lastRefresh
              ? `${totalInstances} instances · ${activeInstanceCount(platform.statusCounts)} active · updated ${formatLastSeen(platform.lastRefresh)} · live stream`
              : 'Waiting for platform stats stream…'
          )
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

function renderEdgePanel(edge, chartTick) {
  void chartTick
  const stats = normalizeStats(edge.stats)
  const history = historyByEdgeId[edge.edge_id] || []
  const reqSeries = history.map((point) => normalizeStats(point.stats).requests || 0)
  const errSeries = history.map((point) => normalizeStats(point.stats).errors || 0)
  const status = edge.status || 'unknown'
  const hosts = topEntries(stats.hosts)
  const ips = topEntries(stats.ips)
  const countries = topEntries(stats.countries)

  return t.div(
    { className: 'live-edge-panel' },
    t.div(
      { className: 'live-edge-header' },
      t.div(
        null,
        t.h3({ className: 'live-edge-title' }, edge.label || edge.edge_id),
        t.p({ className: 'live-edge-subtitle' }, edge.edge_id)
      ),
      t.span({ className: `live-status ${status}` }, status)
    ),
    t.p(
      { className: 'live-meta m-0' },
      `Last seen ${formatLastSeen(edge.last_seen)} · ${history.length} points this session`
    ),
    t.div(
      { className: 'live-platform-grid live-edge-stats-grid' },
      renderLiveStat('Requests (10s)', stats.requests || 0, 'ok', reqSeries),
      renderLiveStat('Errors (10s)', stats.errors || 0, stats.errors ? 'warn' : '', errSeries)
    ),
    t.div(
      { className: 'grid sm' },
      t.div({ className: 'col-lg-4 col-md-12' }, renderTopTable('Top hosts', hosts)),
      t.div({ className: 'col-lg-4 col-md-12' }, renderTopTable('Top IPs', ips)),
      t.div({ className: 'col-lg-4 col-md-12' }, renderTopTable('Top countries', countries))
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
        chartTick: 0,
      }),
      platform: store({
        statusCounts: {},
        totalUsers: null,
        loading: true,
        lastRefresh: null,
        chartTick: 0,
      }),
    }
    startLivePage(livePage)
  }

  const { data, platform } = livePage

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
      () => renderPlatformPanel(platform, () => void forceRecountPlatform(livePage)),
      t.h2({ className: 'live-section-heading live-divider' }, 'Edges'),
      () =>
        data.edges.length
          ? t.div(
              { className: 'grid sm' },
              ...data.edges.map((edge) =>
                t.div({ className: 'col-lg-6 col-md-12 m-b-base', key: edge.id }, renderEdgePanel(edge, data.chartTick))
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

function applyPlatformPayload(platform, payload) {
  const stats = parsePlatformPayload(payload)
  if (!stats?.statusCounts) return

  platform.statusCounts = stats.statusCounts
  platform.totalUsers = stats.totalUsers ?? platform.totalUsers
  platform.lastRefresh = stats.updatedAt || new Date().toISOString()
  platform.loading = false
  rememberPlatformPoint(platform)
}

async function forceRecountPlatform(livePage) {
  const { data, platform } = livePage
  if (platform.loading) return

  platform.loading = true
  try {
    const stats = await app.pb.send('/api/admin/live/platform/refresh', { method: 'POST' })
    applyPlatformPayload(platform, stats)
  } catch (err) {
    if (!isAbortError(err)) {
      data.error = String(err)
    }
    platform.loading = false
  }
}

function startLivePage(livePage) {
  const { data, platform } = livePage

  async function loadEdges() {
    try {
      data.error = ''
      data.edges = await app.pb.collection('edges').getFullList({ sort: 'edge_id', ...NO_AUTO_CANCEL })
      for (const edge of data.edges) {
        rememberPoint(edge.edge_id, edge.stats)
      }
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
      rememberPoint(record.edge_id, record.stats)
      upsertEdge(data.edges, record)
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

  loadEdges()
  ensureEdgeSubscribe()
  ensurePlatformSubscribe()
}
