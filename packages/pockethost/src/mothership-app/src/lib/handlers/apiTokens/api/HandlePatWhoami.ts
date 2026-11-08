import { bearerToken } from '$common/pat'
import { verifyPat } from '../lib/verifyPat'

/** GET /api/pat/whoami with `Authorization: Bearer ph_pat_…`. Lets the CLI show who a token belongs to. */
export const HandlePatWhoami = (e: core.RequestEvent) => {
  const outcome = verifyPat(bearerToken(e.request?.header.get('Authorization')), e.realIP())
  if (!outcome.ok) {
    return e.json(outcome.status, { status: outcome.status, message: outcome.message })
  }
  const { result, token, user } = outcome
  const instances =
    result.instanceIds === null
      ? null
      : result.instanceIds
          .map((id) => {
            try {
              const r = $app.findRecordById('instances', id)
              return { id: r.id, subdomain: r.getString('subdomain') }
            } catch {
              return null
            }
          })
          .filter((v) => !!v)
  return e.json(200, {
    email: user.getString('email'),
    label: result.label,
    hint: token.getString('hint'),
    scopes: result.scopes,
    instances,
    expires: token.getString('expires'),
  })
}
