onRecordCreateRequest((e) => {
  require(`${__hooks}/mothership`).BeforeCreate_ssh_keys(e)
  e.next()
}, 'ssh_keys')

onRecordUpdateRequest((e) => {
  require(`${__hooks}/mothership`).BeforeUpdate_ssh_keys(e)
  e.next()
}, 'ssh_keys')
