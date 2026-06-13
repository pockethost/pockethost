import { mkLog } from '$util/Logger'

export const HandleMetaUpdateAtBoot = (_e: core.BootstrapEvent) => {
  const log = mkLog('HandleMetaUpdateAtBoot')
  log(`At top of HandleMetaUpdateAtBoot`)
  log(`app URL`, process.env.APP_URL)

  const settings = $app.settings()
  settings.meta = {
    ...settings.meta,
    appUrl: process.env.APP_URL || settings.meta.appUrl,
    verificationTemplate: {
      ...settings.meta.verificationTemplate,
      actionUrl: `{APP_URL}/login/confirm-account/{TOKEN}`,
    },
    resetPasswordTemplate: {
      ...settings.meta.resetPasswordTemplate,
      actionUrl: `{APP_URL}/login/password-reset/confirm/{TOKEN}`,
    },
    confirmEmailChangeTemplate: {
      ...settings.meta.confirmEmailChangeTemplate,
      actionUrl: `{APP_URL}/login/confirm-email-change/{TOKEN}`,
    },
  }

  log(`Saving settings`)
  $app.save(settings)
  log(`Saved settings`)
}
