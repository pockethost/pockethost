type LiveInstance = {
  id?: string
  status?: string
}

/**
 * Save per row (not bulk SQL) so dashboard SSE clients get status updates.
 *
 * @param edgeRecordId When an edge reports (edge login), only instances on that edge are touched
 */
export const applyLiveInstances = (app: core.App, liveInstances: LiveInstance[], edgeRecordId?: string) => {
  let updated = 0

  for (const live of liveInstances) {
    const id = live?.id?.trim()
    const status = live?.status?.trim()
    if (!id || !status) continue
    if (status !== `starting` && status !== `running`) continue

    let record: models.Record
    try {
      record = app.findRecordById(`instances`, id)
    } catch {
      continue
    }

    if (edgeRecordId && record.getString(`edge`) !== edgeRecordId) continue
    if (!record.get(`power`)) continue
    if (record.getString(`status`) === status) continue

    record.set(`status`, status)
    app.save(record)
    updated++
  }

  return updated
}
