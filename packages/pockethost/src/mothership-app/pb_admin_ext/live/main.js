document.head.appendChild(
  t.link({
    rel: 'stylesheet',
    href: '/_/extensions/live/style.css',
  })
)

const HISTORY_MAX = 360
const NO_AUTO_CANCEL = { $autoCancel: false }
const INSTANCE_STATUSES = [
  { key: 'running', label: 'Running', tone: 'ok' },
  { key: 'starting', label: 'Starting', tone: 'ok' },
  { key: 'porting', label: 'Porting', tone: 'ok' },
  { key: 'vacuuming', label: 'Vacuuming', tone: 'warn' },
  { key: 'idle', label: 'Idle' },
  { key: 'failed', label: 'Failed', tone: 'warn' },
  { key: 'unknown', label: 'Unknown', filter: `status = ""`, tone: 'warn' },
]
const historyByEdgeId = {}
const platformHistory = []
let platformRefreshInFlight = null
let livePage = null
const PLATFORM_POLL_MS = 30_000

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

function rememberPlatformPoint(platform) {
  platformHistory.push({
    t: Date.now(),
    statusCounts: { ...platform.statusCounts },
    users: platform.totalUsers || 0,
  })
  if (platformHistory.length > HISTORY_MAX) {
    platformHistory.shift()
  }
}

function platformSeries(key) {
  return platformHistory.map((point) => {
    if (key === 'users') return point.users || 0
    return point.statusCounts?.[key] || 0
  })
}

function rememberPoint(edgeId, stats) {
  if (!historyByEdgeId[edgeId]) {
    historyByEdgeId[edgeId] = []
  }
  historyByEdgeId[edgeId].push({ t: Date.now(), stats: stats || {} })
  if (historyByEdgeId[edgeId].length > HISTORY_MAX) {
    historyByEdgeId[edgeId].shift()
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

function renderBars(values, kind) {
  const series = values.slice(-24)
  while (series.length < 24) {
    series.unshift(0)
  }
  const max = Math.max(...series, 1)

  return t.div(
    { className: 'live-bars' },
    ...series.map((value) =>
      t.div({
        className: `live-bar ${kind}${value ? '' : ' empty'}`,
        style: { height: `${Math.max(4, Math.round((value / max) * 100))}%` },
        title: String(value),
      })
    )
  )
}

function barKindForTone(tone) {
  return tone === 'warn' ? ' err' : tone === 'ok' ? ' ok' : ''
}

function renderPlatformStat(label, value, tone, seriesKey) {
  return t.div(
    { className: 'live-stat' },
    t.div({ className: 'live-stat-label' }, label),
    t.div({ className: `live-stat-value${tone ? ` ${tone}` : ''}` }, String(value ?? '—')),
    renderBars(platformSeries(seriesKey), barKindForTone(tone))
  )
}

function renderPlatformPanel(platform) {
  const totalInstances = sumStatusCounts(platform.statusCounts)

  return t.div(
    { className: 'live-platform-panel' },
    t.h2({ className: 'live-section-heading' }, 'Platform'),
    t.div(
      { className: 'live-platform-grid' },
      ...INSTANCE_STATUSES.map((status) =>
        renderPlatformStat(
          status.label,
          platform.statusCounts?.[status.key] ?? (platform.loading ? '…' : '—'),
          status.tone,
          status.key
        )
      ),
      renderPlatformStat('Users', platform.totalUsers ?? (platform.loading ? '…' : '—'), '', 'users')
    ),
    () =>
      platform.loading
        ? t.p({ className: 'live-meta m-t-10 m-b-0' }, 'Refreshing counts…')
        : t.p(
            { className: 'live-meta m-t-10 m-b-0' },
            platform.lastRefresh
              ? `${totalInstances} instances · ${activeInstanceCount(platform.statusCounts)} active · updated ${formatLastSeen(platform.lastRefresh)}`
              : 'Platform counts refresh every 30s'
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

function renderEdgePanel(edge) {
  const stats = edge.stats || {}
  const history = historyByEdgeId[edge.edge_id] || []
  const reqSeries = history.map((point) => point.stats?.requests || 0)
  const errSeries = history.map((point) => point.stats?.errors || 0)
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
      { className: 'live-stat-grid' },
      t.div(
        { className: 'live-stat' },
        t.div({ className: 'live-stat-label' }, 'Requests (10s window)'),
        t.div({ className: 'live-stat-value ok' }, String(stats.requests || 0))
      ),
      t.div(
        { className: 'live-stat' },
        t.div({ className: 'live-stat-label' }, 'Errors (10s window)'),
        t.div({ className: `live-stat-value ${stats.errors ? 'warn' : ''}` }, String(stats.errors || 0))
      ),
      t.div(
        { className: 'live-stat' },
        t.div({ className: 'live-stat-label' }, 'Top host hits'),
        t.div({ className: 'live-stat-value' }, hosts.length ? String(hosts[0][1]) : '0')
      )
    ),
    t.div(
      { className: 'live-spark-row' },
      t.div(
        { className: 'live-spark' },
        t.p({ className: 'live-section-title' }, 'Request rate'),
        renderBars(reqSeries, '')
      ),
      t.div(
        { className: 'live-spark' },
        t.p({ className: 'live-section-title' }, 'Error rate'),
        renderBars(errSeries, ' err')
      )
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
        platformPollStarted: false,
      }),
      platform: store({
        statusCounts: {},
        totalUsers: null,
        loading: true,
        lastRefresh: null,
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
        { className: 'page-header' },
        t.div(
          { className: 'flex-fill' },
          t.h1({ className: 'm-0' }, 'Live'),
          t.p(
            { className: 'txt-hint m-t-5 m-b-0' },
            'Realtime mothership fleet view — platform counts, edge traffic, session sparklines.'
          )
        )
      ),
      () => (data.error ? t.div({ className: 'txt-danger m-b-base' }, data.error) : null),
      () => renderPlatformPanel(platform),
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

function startLivePage(livePage) {
  const { data, platform } = livePage

  async function refreshPlatformCounts() {
    if (platformRefreshInFlight) {
      return platformRefreshInFlight
    }

    platform.loading = true
    platformRefreshInFlight = (async () => {
      try {
        const statusRequests = INSTANCE_STATUSES.map((status) =>
          app.pb.collection('instances').getList(1, 1, {
            ...NO_AUTO_CANCEL,
            filter: status.filter || `status = '${status.key}'`,
          })
        )

        const [users, ...statusResults] = await Promise.all([
          app.pb.collection('users').getList(1, 1, NO_AUTO_CANCEL),
          ...statusRequests,
        ])

        const statusCounts = {}
        for (let i = 0; i < INSTANCE_STATUSES.length; i++) {
          statusCounts[INSTANCE_STATUSES[i].key] = statusResults[i].totalItems
        }

        platform.statusCounts = statusCounts
        platform.totalUsers = users.totalItems
        platform.lastRefresh = new Date().toISOString()
        rememberPlatformPoint(platform)
      } catch (err) {
        if (!isAbortError(err)) {
          data.error = String(err)
        }
      } finally {
        platform.loading = false
        platformRefreshInFlight = null
      }
    })()

    return platformRefreshInFlight
  }

  async function loadEdges() {
    try {
      data.error = ''
      data.edges = await app.pb.collection('edges').getFullList({ sort: 'edge_id', ...NO_AUTO_CANCEL })
      for (const edge of data.edges) {
        rememberPoint(edge.edge_id, edge.stats || {})
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
      rememberPoint(record.edge_id, record.stats || {})
      upsertEdge(data.edges, record)
    })
  }

  function ensurePlatformPoll() {
    if (data.platformPollStarted) {
      return
    }
    data.platformPollStarted = true
    setInterval(() => {
      void refreshPlatformCounts()
    }, PLATFORM_POLL_MS)
  }

  void refreshPlatformCounts()
  loadEdges()
  ensureEdgeSubscribe()
  ensurePlatformPoll()
}
