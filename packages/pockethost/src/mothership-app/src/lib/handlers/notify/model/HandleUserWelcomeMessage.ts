import { mkLog } from '$util/Logger'
import { mkAudit } from '$util/mkAudit'
import { mkNotifier } from '$util/mkNotifier'

export const HandleUserWelcomeMessage = (e: core.RecordEvent) => {
  const dao = $app
  const newModel = e.record
  
  if(!newModel) return e.next()

  const oldModel = newModel?.original()
  
  const log = mkLog(`user-welcome-msg`)
  const notify = mkNotifier(log, dao)
  const audit = mkAudit(log, dao)

  try {
    log({ newModel, oldModel })

    // Bail out if we aren't verified
    const isVerified = newModel.getBool('verified')
    if (!isVerified) return

    // Bail out if the verified mode flag has not changed
    if (isVerified === oldModel.getBool(`verified`)) return

    log(`user just became verified`)
    const uid = newModel.id

    notify(`email`, `welcome`, uid)
    newModel.set(`welcome`, new DateTime())
  } catch (e) {
    audit(`ERROR`, `${e}`, { user: newModel.id })
  }
  e.next()
}
