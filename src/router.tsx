/**
 * Minimal hash-based router, zero dependencies, Vercel-friendly.
 * Routes look like: #/modules/attention, #/playground, #/glossary
 */
import { useCallback, useEffect, useState } from 'react'

export type Route = { path: string; parts: string[] }

function parseHash(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/'
  const path = raw.split('?')[0]
  const parts = path.split('/').filter(Boolean)
  return { path, parts }
}

export function useRoute(): Route {
  const [route, setRoute] = useState(parseHash)

  useEffect(() => {
    const onChange = () => setRoute(parseHash())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return route
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
  window.location.hash = to
  scrollToTopInstantly()
}

export function useNavigate() {
  return useCallback((to: string) => navigate(to), [])
}

/** Scroll to top on route path change */
export function useScrollTopOnRoute(path: string) {
  useEffect(() => {
    scrollToTopInstantly()
  }, [path])
}
