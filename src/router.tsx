/**
 * Minimal history-based router, zero dependencies.
 * Routes are clean paths: /modules/attention, /playground, /glossary.
 * A Vercel rewrite serves index.html for every path so deep links and
 * refreshes work; legacy #/... URLs are converted on boot.
 */
import { useCallback, useEffect, useSyncExternalStore } from 'react'

export type Route = { path: string; parts: string[]; demo?: boolean }

function parseLocation(): Route {
  // Normalize trailing slashes so /modules/attention/ and /modules/attention match
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  const parts = path.split('/').filter(Boolean)
  // "?demo" deep-links straight to the module's interactive widget
  const demo = new URLSearchParams(window.location.search).has('demo')
  return { path, parts, demo: demo || undefined }
}

// One-time: convert legacy #/... bookmarks to clean paths so old links keep working.
if (typeof window !== 'undefined' && window.location.hash.startsWith('#/')) {
  history.replaceState(null, '', window.location.hash.slice(1) || '/')
}

// ── Tiny navigation store (reactive like lib/progress) ─────────
type Listener = () => void
const listeners = new Set<Listener>()
let current = parseLocation()

function sameRoute(a: Route, b: Route): boolean {
  return a.path === b.path && a.demo === b.demo
}

function refresh() {
  const next = parseLocation()
  if (sameRoute(current, next)) return
  current = next
  for (const l of listeners) l()
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', refresh)

  // Intercept plain internal links so <a href="/modules/x"> navigates
  // SPA-style instead of triggering a full document reload.
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const anchor = (e.target as HTMLElement | null)?.closest?.('a')
    if (!anchor) return
    const href = anchor.getAttribute('href')
    // Only "/"-prefixed (internal, clean-path) hrefs are ours; hash anchors,
    // external URLs, and protocol links fall through to the browser.
    if (!href || !href.startsWith('/')) return
    if (anchor.target && anchor.target !== '_self') return
    if (anchor.hasAttribute('download')) return
    e.preventDefault()
    navigate(href)
  })
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, () => current, () => current)
}

/**
 * Instant jump to the very top of the document. Bypasses the CSS
 * `scroll-behavior: smooth` on <html>, which turns scrollTo into an
 * interruptible animation that routinely fails to complete when the route
 * swap re-renders the page mid-scroll (most visible on phones).
 */
function scrollToTopInstantly() {
  const html = document.documentElement
  const prevBehavior = html.style.scrollBehavior
  html.style.scrollBehavior = 'auto'
  window.scrollTo(0, 0)
  // Older iOS Safari scrolls <body>, not <html>; set both to be safe.
  document.body.scrollTop = 0
  document.documentElement.scrollTop = 0
  html.style.scrollBehavior = prevBehavior
}

export function navigate(to: string) {
  // Accept legacy "#/x" targets too, they become clean paths
  const dest = to.startsWith('#') ? to.slice(1) : to
  history.pushState(null, '', dest)
  refresh()
  scrollToTopInstantly()
}

export function useNavigate() {
  return useCallback((to: string) => navigate(to), [])
}

/**
 * Scroll to top on route path change. With the "?demo" deep link, scroll
 * directly to the module's widget instead (the module component is a lazy
 * import, so retry frame by frame until the first widget frame exists).
 */
export function useScrollTopOnRoute(path: string, demo?: boolean) {
  useEffect(() => {
    if (!demo) {
      scrollToTopInstantly()
      return
    }
    let raf = 0
    let tries = 0
    const jump = () => {
      const target = document.querySelector('section[data-demo]')
      if (target) {
        const html = document.documentElement
        const prev = html.style.scrollBehavior
        html.style.scrollBehavior = 'auto'
        target.scrollIntoView({ block: 'start' })
        html.style.scrollBehavior = prev
      } else if (tries++ < 120) {
        raf = requestAnimationFrame(jump)
      }
    }
    jump()
    return () => cancelAnimationFrame(raf)
  }, [path, demo])
}
