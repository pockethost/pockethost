type LiveInstance = {
  id?: string
  status?: string
}

/** SaveRecord per row (not bulk SQL) so dashboard SSE clients get status updates. */
export const applyLiveInstances = (dao: core.Dao, liveInstances: LiveInstance[]) => {
  let updated = 0

  for (const live of liveInstances) {
    const id = live?.id?.trim()
    const status = live?.status?.trim()
    if (!id || !status) continue
    if (status !== `starting` && status !== `running`) continue

    let record: models.Record
    try {
      record = dao.findRecordById(`instances`, id)
    } catch {
      continue
    }

    if (!record.get(`power`)) continue
    if (record.getString(`status`) === status) continue

    record.set(`status`, status)
    dao.saveRecord(record)
    updated++
  }

  return updated
}
