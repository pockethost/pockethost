import { allowanceParts, createLimitError, powerOnLimitError, type LimitInstance } from '$common/instanceLimits'

/** Every instance the user owns, in the shape the limit rules need. */
const ownedInstances = (uid: string): LimitInstance[] =>
  $app.findRecordsByFilter('instances', 'uid = {:uid}', '', 0, 0, { uid }).map((r) => ({
    id: r.id,
    power: r.getBool('power'),
    suspension: r.getString('suspension'),
    updated: r.getString('updated'),
  }))

/** Paid + bonus instances (bonus only counts while at least one is paid). */
const allowanceOf = (uid: string) => {
  const user = $app.findRecordById('users', uid)
  return allowanceParts({
    subscription_quantity: user.getInt('subscription_quantity'),
    bonus_instances: user.getInt('bonus_instances'),
  })
}

/** 402 Payment Required: the plan doesn't include another instance. */
const limitError = (message: string) => new ApiError(402, message, {})

/** Throws 402 when the user already owns every instance their plan includes (archived ones don't count). */
export const assertCanCreateInstance = (uid: string) => {
  const message = createLimitError(ownedInstances(uid), allowanceOf(uid))
  if (message) throw limitError(message)
}

/** Throws 402 when powering on `instanceId` would run more instances than the user's plan includes. */
export const assertCanPowerOn = (uid: string, instanceId: string) => {
  const message = powerOnLimitError(instanceId, ownedInstances(uid), allowanceOf(uid))
  if (message) throw limitError(message)
}
