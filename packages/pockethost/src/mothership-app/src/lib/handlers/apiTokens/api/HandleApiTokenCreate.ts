import {
  formatPat,
  PAT_LABEL_MAX,
  PAT_MAX_PER_USER,
  PAT_SECRET_ALPHABET,
  PAT_SECRET_LENGTH,
  patHint,
} from '$common/pat'

/**
 * POST /api/tokens (JWT auth only). Body: `{ label, scopes?, all_instances?, instances?, expires? }`. Returns the token
 * once; only its sha256 is stored.
 */
export const HandleApiTokenCreate = (e: core.RequestEvent) => {
  const auth = e.auth
  if (!auth) {
    throw new UnauthorizedError('Authentication required.')
  }

  const body = (e.requestInfo().body || {}) as Record<string, unknown>

  const label = typeof body.label === 'string' ? body.label.trim() : ''
  if (!label) throw new BadRequestError('Label is required.')
  if (label.length > PAT_LABEL_MAX) throw new BadRequestError(`Label must be at most ${PAT_LABEL_MAX} characters.`)

  const rawScopes = Array.isArray(body.scopes) ? body.scopes : ['read', 'write']
  const scopes = new Set<string>()
  for (const s of rawScopes) {
    if (s !== 'read' && s !== 'write') throw new BadRequestError(`Unknown scope: ${s}`)
    scopes.add(s)
  }
  if (scopes.has('write')) scopes.add('read')
  if (scopes.size === 0) throw new BadRequestError('Choose at least one scope.')

  const allInstances = body.all_instances === true
  const instanceIds = Array.isArray(body.instances)
    ? [...new Set(body.instances.filter((v): v is string => typeof v === 'string'))]
    : []
  if (!allInstances && instanceIds.length === 0) {
    throw new BadRequestError('Select at least one instance or choose all instances.')
  }
  if (!allInstances) {
    for (const id of instanceIds) {
      let instance: core.Record
      try {
        instance = $app.findRecordById('instances', id)
      } catch {
        throw new BadRequestError('One or more selected instances were not found.')
      }
      if (instance.getString('uid') !== auth.id) {
        throw new BadRequestError('One or more selected instances are not owned by you.')
      }
    }
  }

  let expires = ''
  if (typeof body.expires === 'string' && body.expires.trim()) {
    const t = Date.parse(body.expires.trim())
    if (Number.isNaN(t)) throw new BadRequestError('Invalid expiry date.')
    if (t <= Date.now()) throw new BadRequestError('Expiry must be in the future.')
    expires = new Date(t).toISOString()
  }

  const existing = $app.findRecordsByFilter('api_tokens', 'user = {:user}', '', 0, 0, { user: auth.id })
  if (existing.length >= PAT_MAX_PER_USER) {
    throw new BadRequestError(`You can have at most ${PAT_MAX_PER_USER} tokens. Revoke one first.`)
  }

  const secret = $security.randomStringWithAlphabet(PAT_SECRET_LENGTH, PAT_SECRET_ALPHABET)
  const record = new Record($app.findCollectionByNameOrId('api_tokens'))
  record.set('user', auth.id)
  record.set('label', label)
  record.set('secret_hash', $security.sha256(secret))
  record.set('hint', patHint(secret))
  record.set('scopes', [...scopes])
  record.set('all_instances', allInstances)
  record.set('instances', allInstances ? [] : instanceIds)
  record.set('expires', expires)
  $app.save(record)

  return e.json(200, {
    token: formatPat(record.id, secret),
    record: {
      id: record.id,
      label,
      hint: record.getString('hint'),
      scopes: [...scopes],
      all_instances: allInstances,
      instances: allInstances ? [] : instanceIds,
      expires: record.getString('expires'),
      created: record.getString('created'),
    },
  })
}
