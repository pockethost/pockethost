/** Superuser status edits on a bulk mail campaign (see handlers/bulkmail/ui.ts). Pure, so it is unit-tested. */
/** Which engine call a status change maps to, or an error message. */
export const statusAction = (from: string, to: string): 'start' | 'resume' | 'pause' | 'cancel' | string => {
  if (to === 'canceled') return ['done', 'canceled'].includes(from) ? `can't cancel a ${from} campaign` : 'cancel'
  if (to === 'paused') return ['sending', 'scheduled'].includes(from) ? 'pause' : `can't pause a ${from} campaign`
  if (to === 'sending' || to === 'scheduled') {
    if (from === 'paused') return 'resume'
    if (from === 'draft') return 'start'
    return `can't start a ${from} campaign`
  }
  return `status ${to} is set by the sender, not by hand`
}
