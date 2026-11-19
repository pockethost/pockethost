// GET /api/mirror (the edges' dump) is served in Go by `pockethost mothership` (cmd/pockethost/mothership_mirror.go),
// off the one JS VM. Only an edge's report of its live instances runs here.
routerAdd(
  'POST',
  '/api/mirror',
  (e) => {
    return require(`${__hooks}/mothership`).HandleMirrorSync(e)
  },
  $apis.gzip(),
  $apis.requireSuperuserAuth()
)
