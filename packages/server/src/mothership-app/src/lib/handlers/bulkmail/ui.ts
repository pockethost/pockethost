/**
 * Campaigns are run from the stock superuser UI (Collections > _bulkmail_campaigns), which replaced the `pockethost
 * mail send` CLI. Saving a campaign record does what the CE plugin's buttons do:
 *
 * - Status draft -> sending (or scheduled): start. A future scheduled_at makes it scheduled.
 * - Status sending/scheduled -> paused: pause. paused -> sending: resume.
 * - Status -> canceled: cancel.
 * - Saving a draft with test_to set, after changing its content or test_to: a [TEST] send to test_to.
 *
 * Other status changes (to done, or back to draft) are refused. The status a superuser picks is never written as is:
 * the engine sets it, so a refused start leaves the campaign where it was. Collection rules are superuser-only.
 */
import { statusAction } from '$util/bulkmail/status'
import { BM_CAMPAIGNS, cancelCampaign, pauseCampaign, resumeCampaign, startCampaign, testCampaign } from './engine'

const CONTENT_FIELDS = ['subject', 'html', 'text', 'test_to', 'audience', 'vars', 'from_name', 'from_address']

const msg = (err: any) => `${err}`.replace(/^Error: /, '')

export const HandleBulkMailCampaignUpdateRequest = (e: core.RecordRequestEvent) => {
  const rec = e.record!
  const orig = rec.original()
  const from = orig.getString('status') || 'draft'
  const to = rec.getString('status') || 'draft'

  if (from !== to) {
    const action = statusAction(from, to)
    if (!['start', 'resume', 'pause', 'cancel'].includes(action)) throw new BadRequestError(action)
    // Save the other edits with the old status, then let the engine move it.
    rec.set('status', from)
    $app.save(rec)
    try {
      if (action === 'start') startCampaign(rec.id)
      else if (action === 'resume') resumeCampaign(rec.id)
      else if (action === 'pause') pauseCampaign(rec.id)
      else cancelCampaign(rec.id)
    } catch (err) {
      throw new BadRequestError(`Saved, but couldn't ${action}: ${msg(err)}`)
    }
    return e.json(200, $app.findRecordById(BM_CAMPAIGNS, rec.id))
  }

  const changed = CONTENT_FIELDS.some((f) => JSON.stringify(orig.get(f)) !== JSON.stringify(rec.get(f)))
  if (from !== 'draft' || !changed || !rec.getString('test_to').trim()) return e.next()

  $app.save(rec)
  try {
    testCampaign(rec.id)
  } catch (err) {
    throw new BadRequestError(`Saved, but the test send failed: ${msg(err)}`)
  }
  return e.json(200, $app.findRecordById(BM_CAMPAIGNS, rec.id))
}
