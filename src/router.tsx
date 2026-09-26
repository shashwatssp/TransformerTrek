/**
 * Minimal hash-based router, zero dependencies, Vercel-friendly.
 * Routes look like: #/modules/attention, #/playground, #/glossary
 */
import { useCallback, useEffect, useState } from 'react'

export type Route = { path: string; parts: string[]; demo?: boolean }

function parseHash(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/'
  const qIdx = raw.indexOf('?')
  const path = (qIdx === -1 ? raw : raw.slice(0, qIdx)) || '/'
  const parts = path.split('/').filter(Boolean)
  // "?demo" deep-links straight to the module's interactive widget
  const demo = qIdx !== -1 && new URLSearchParams(raw.slice(qIdx + 1)).has('demo')
  return { path, parts, demo: demo || undefined }
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
