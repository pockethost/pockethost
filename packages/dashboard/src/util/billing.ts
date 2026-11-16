/**
 * Billing, in one place. Every billing call in the dashboard goes through here, never to the provider directly, so a
 * provider change stays inside this module. The mothership picks the provider per checkout: Lemon Squeezy (an overlay
 * on our page) or Stripe Managed Payments (Stripe's hosted checkout page).
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
/** Where a guest goes after paying: claim the account the payment created. */
export const CLAIM_PATH = '/claim'

const CLAIM_KEY = 'ph_claim'
/**
 * The browser claim token from a guest checkout. Kept in localStorage so a reload or the redirect fallback still has
 * it.
 */
export const savedClaim = () => {
  try {
    return localStorage.getItem(CLAIM_KEY) || ''
  } catch {
    return ''
  }
}
export const forgetClaim = () => {
  try {
    localStorage.removeItem(CLAIM_KEY)
  } catch {}
}
const saveClaim = (claim: string) => {
  try {
    localStorage.setItem(CLAIM_KEY, claim)
  } catch {}
}

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
 * Start checkout for a plan. Stripe: sends the browser to Stripe's checkout page. Lemon Squeezy: opens the checkout as
 * an overlay on our page when Lemon.js loads, and goes to `nextPath` when the payment goes through; otherwise sends the
 * browser to the hosted checkout page. Logged out, the payment creates the account: the claim token is kept for
 * /claim.
 */
export const startCheckout = async (pvId: string, nextPath: string) => {
  const { url, claim, provider } = await createLemonSqueezyCheckout(pvId)
  if (claim) saveClaim(claim)
  // Stripe: its own checkout page, which returns to the success URL the mothership set (same as `nextPath`).
  if (provider === 'stripe') {
    window.location.href = url
    return
  }
  const ls = await loadLemonJs()
  if (!ls) {
    window.location.href = url
    return
  }
  ls.Setup({
    eventHandler: (e) => {
      if (e.event === 'Checkout.Success') {
        // A full page load, not a client-side goto: Lemon.js leaves its overlay layer (backdrop + spinner) in the DOM
        // after Close(), which covered /claim.
        ls.Url.Close()
        window.location.assign(nextPath)
      }
    },
  })
  ls.Url.Open(embedUrl(url))
}

export const cancelMembership = () => cancelLemonSqueezyMembership()
