/**
 * Billing, in one place. Every billing call in the dashboard goes through here, never to the provider directly, so a
 * later provider change (e.g. Stripe Managed Payments) stays inside this module. Today the provider is Lemon Squeezy.
 */
import { cancelLemonSqueezyMembership, createLemonSqueezyCheckout } from './lemonsqueezy'
export {
  INSTANCE_ANNUAL_PV_ID,
  INSTANCE_LIFETIME_PV_ID,
  INSTANCE_MONTHLY_PV_ID,
  type CancelMembershipResult,
} from './lemonsqueezy'

/** Where a customer goes after paying: the dashboard, which waits for the payment and then offers "New instance". */
export const AFTER_CHECKOUT_PATH = '/dashboard?paid=1'

const LEMON_JS = 'https://app.lemonsqueezy.com/js/lemon.js'

type LemonSqueezyGlobal = Window['LemonSqueezy']
/** Lemon.js globals (typed in src/lemonsqueezy.d.ts), absent until the script loads. */
const lsWindow = () => window as Partial<Pick<Window, 'createLemonSqueezy' | 'LemonSqueezy'>>

let lemonJs: Promise<LemonSqueezyGlobal | undefined> | undefined

/** Load Lemon.js once. Resolves undefined if it can't load (blocked, offline), so callers fall back to a redirect. */
const loadLemonJs = () => {
  if (lemonJs) return lemonJs
  lemonJs = new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(undefined)
    const ready = () => {
      try {
        lsWindow().createLemonSqueezy?.()
        resolve(lsWindow().LemonSqueezy)
      } catch {
        resolve(undefined)
      }
    }
    if (lsWindow().LemonSqueezy) return ready()
    const s = document.createElement('script')
    s.src = LEMON_JS
    s.defer = true
    s.onload = ready
    s.onerror = () => resolve(undefined)
    setTimeout(() => resolve(lsWindow().LemonSqueezy), 8000)
    document.head.appendChild(s)
  })
  return lemonJs
}

/** The overlay needs `embed=1` on the checkout URL. */
const embedUrl = (url: string) => {
  const u = new URL(url)
  u.searchParams.set('embed', '1')
  return u.toString()
}

/**
 * Start checkout for a plan. Opens the checkout as an overlay on our page when Lemon.js loads, and calls `onSuccess`
 * when the payment goes through; otherwise sends the browser to the hosted checkout page.
 */
export const startCheckout = async (pvId: string, onSuccess: () => void) => {
  const url = await createLemonSqueezyCheckout(pvId)
  const ls = await loadLemonJs()
  if (!ls) {
    window.location.href = url
    return
  }
  ls.Setup({
    eventHandler: (e) => {
      if (e.event === 'Checkout.Success') {
        ls.Url.Close()
        onSuccess()
      }
    },
  })
  ls.Url.Open(embedUrl(url))
}

export const cancelMembership = () => cancelLemonSqueezyMembership()
