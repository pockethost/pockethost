import { INSTANCE_ANNUAL_PV_ID, INSTANCE_MONTHLY_PV_ID } from 'pockethost/common'
import { describe, expect, it } from 'vitest'
import { checkoutIntentUrl, planLabelForPvId, readCheckoutPvIdFromSearch } from './checkoutIntent'

describe('checkoutIntent', () => {
  it('builds get-started URL with pvId', () => {
    expect(checkoutIntentUrl(INSTANCE_MONTHLY_PV_ID)).toBe(
      `/get-started?pvId=${encodeURIComponent(INSTANCE_MONTHLY_PV_ID)}`
    )
  })

  it('reads valid pvId from search', () => {
    expect(readCheckoutPvIdFromSearch(`?pvId=${INSTANCE_MONTHLY_PV_ID}`)).toBe(INSTANCE_MONTHLY_PV_ID)
  })

  it('ignores unknown pvId', () => {
    expect(readCheckoutPvIdFromSearch('?pvId=0-0')).toBe('')
  })

  it('labels monthly plan', () => {
    expect(planLabelForPvId(INSTANCE_MONTHLY_PV_ID)).toContain('$9.99')
  })

  it('labels annual plan with savings hint', () => {
    expect(planLabelForPvId(INSTANCE_ANNUAL_PV_ID)).toContain('$59.99')
    expect(planLabelForPvId(INSTANCE_ANNUAL_PV_ID)).toContain('save')
  })
})
