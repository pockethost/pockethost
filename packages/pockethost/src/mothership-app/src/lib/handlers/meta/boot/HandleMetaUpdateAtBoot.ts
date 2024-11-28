import { mkLog } from '$util/Logger'

export const HandleMetaUpdateAtBoot = (c: core.BootstrapEvent) => {
  const log = mkLog('HandleMetaUpdateAtBoot')
  log(`At top of HandleMetaUpdateAtBoot`)
  log(`***app URL`, process.env.APP_URL)
  const form = new SettingsUpsertForm($app)
  form.meta = {
    ...$app.settings().meta,
    appUrl: process.env.APP_URL || $app.settings().meta.appUrl,
    verificationTemplate: {
      ...$app.settings().meta.verificationTemplate,
      actionUrl: `{APP_URL}/login/confirm-account/{TOKEN}`,
    },
    resetPasswordTemplate: {
      ...$app.settings().meta.resetPasswordTemplate,
      actionUrl: `{APP_URL}/login/password-reset/confirm/{TOKEN}`,
    },
    confirmEmailChangeTemplate: {
      ...$app.settings().meta.confirmEmailChangeTemplate,
      actionUrl: `{APP_URL}/login/confirm-email-change/{TOKEN}`,
    },
  }
  log(`Saving form`)
  form.submit()
}
