/** Same key as the legacy @beyonk/gdpr-cookie-consent-banner cookieName. */
export const COOKIE_CONSENT_KEY = 'pockethost_gpdr'

const CONSENT_VALUE = 'accepted'
const GA_MEASUREMENT_ID = 'G-5Q6CM5HPCX'

declare global {
  interface Window {
    __pockethostGtagLoaded?: boolean
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

export function hasCookieConsent(): boolean {
  if (typeof document === 'undefined') return false
  if (localStorage.getItem(COOKIE_CONSENT_KEY) === CONSENT_VALUE) return true
  return document.cookie.split(';').some((part) => part.trim().startsWith(`${COOKIE_CONSENT_KEY}=`))
}

let lastTrackedPath = ''

export function acceptCookieConsent(): void {
  localStorage.setItem(COOKIE_CONSENT_KEY, CONSENT_VALUE)
  document.cookie = `${COOKIE_CONSENT_KEY}=${CONSENT_VALUE}; path=/; max-age=31536000; SameSite=Lax`
  trackGoogleAnalyticsPageView(window.location.pathname + window.location.search)
}

export function loadGoogleAnalytics(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return
  if (window.__pockethostGtagLoaded) return
  window.__pockethostGtagLoaded = true

  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments)
  }
  window.gtag('js', new Date())
  window.gtag('config', GA_MEASUREMENT_ID, {
    cookie_domain: 'none',
    send_page_view: false,
  })

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
  document.head.appendChild(script)
}

/** Manual SPA page views via SvelteKit afterNavigate (avoids gtag history hooks). */
export function trackGoogleAnalyticsPageView(pagePath: string): void {
  if (typeof window === 'undefined' || !hasCookieConsent() || pagePath === lastTrackedPath) return

  loadGoogleAnalytics()
  if (!window.gtag) return

  lastTrackedPath = pagePath
  window.gtag('event', 'page_view', {
    page_path: pagePath,
    page_location: `${window.location.origin}${pagePath}`,
  })
}
