onRecordBeforeCreateRequest((e) => {
  return require(`${__hooks}/mothership`).BeforeCreate_ssh_keys(e)
}, 'ssh_keys')

onRecordBeforeUpdateRequest((e) => {
  return require(`${__hooks}/mothership`).BeforeUpdate_ssh_keys(e)
}, 'ssh_keys')
