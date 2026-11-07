routerAdd(
  'POST',
  '/api/cloudflare/hostnames/sweep',
  (e) => {
    return require(`${__hooks}/mothership`).HandleCustomHostnamesSweep(e)
  },
  $apis.requireSuperuserAuth()
)

routerAdd(
  'POST',
  '/api/cloudflare/hostnames/register/{id}',
  (e) => {
    return require(`${__hooks}/mothership`).HandleCustomHostnameRegister(e)
  },
  $apis.requireSuperuserAuth()
)

/** Daily at 04:17 UTC. Dry run (log only) unless MOTHERSHIP_CLOUDFLARE_SWEEP_APPLY is set. */
cronAdd('cloudflare-hostnames', '17 4 * * *', () => {
  require(`${__hooks}/mothership`).cronSweepCustomHostnames()
})
