// Archive and cold-storage backup download links (moved from the edge firewall).
routerAdd('GET', '/_ph/archive/{id}', (e) => {
  return require(`${__hooks}/mothership`).HandleArchiveDownload(e)
})

routerAdd('GET', '/_ph/backup/{id}/{zip}', (e) => {
  return require(`${__hooks}/mothership`).HandleBackupDownload(e)
})
