import { mkLog } from '$util/Logger'

export const HandleMetaUpdateAtBoot = (c: core.BootstrapEvent) => {
  const log = mkLog('HandleMetaUpdateAtBoot')
  log(`At top of HandleMetaUpdateAtBoot`)
  log(`app URL`, process.env.APP_URL)
  const settings = $app.settings()

  if(process.env.APP_URL) {
    settings.meta.appURL = process.env.APP_URL
  }

  // we cant set templates to the settings https://pocketbase.io/jsvm/interfaces/core.MetaConfig.html
  
  // settings.meta.verificationTemplate.actionUrl = `{APP_URL}/login/confirm-account/{TOKEN}`
  // settings.meta.resetPasswordTemplate.actionUrl = `{APP_URL}/login/password-reset/confirm/{TOKEN}`
  // settings.meta.confirmEmailChangeTemplate.actionUrl = `{APP_URL}/login/confirm-email-change/{TOKEN}`
  
  log(`Savingsettings`)
  $app.save(settings)
  log(`Savedsettings`)
}
